import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { PeopleModule } from '../src/people/people.module';
import { JuriesModule } from '../src/juris/juries.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

type Person = {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  email: string | null;
  academicTitle: unknown;
  institution: unknown;
  nationality: unknown;
};
type Jury = { slug: string } & Record<
  'judges' | 'jurors' | 'prosecutors' | 'defenders' | 'bailiffs',
  Person[]
>;
const body = <T>(response: { body: unknown }) => response.body as T;
// Never use the configured application database for integration fixtures.
const databaseDescribe = process.env.PEOPLE_TEST_DATABASE_URL
  ? describe
  : describe.skip;

databaseDescribe(
  'External participants with PostgreSQL and real JWT guards',
  () => {
    let app: INestApplication<App>;
    let db: PrismaService;
    let token: string;
    let adminId: string;
    let memberId: string;
    const tag = `people-external-${randomUUID()}`;

    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.PEOPLE_TEST_DATABASE_URL;
      process.env.JWT_SECRET = 'external-people-test-secret';
      const module = await Test.createTestingModule({
        imports: [PrismaModule, AuthModule, PeopleModule, JuriesModule],
      }).compile();
      app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();
      db = app.get(PrismaService);
      const admin = await db.user.create({
        data: {
          email: `${tag}@example.test`,
          password: 'unused-test-hash',
          role: 'ADMIN',
        },
      });
      adminId = admin.id;
      token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
        sub: adminId,
        version: 0,
      });
      memberId = (
        await db.person.create({
          data: {
            name: `${tag} member`,
            slug: `${tag}-member`,
            category: 'PESQUISADOR',
          },
        })
      ).id;
    }, 20000);

    afterAll(async () => {
      if (db) {
        await db.jury.deleteMany({ where: { title: { startsWith: tag } } });
        await db.person.deleteMany({ where: { name: { startsWith: tag } } });
        if (adminId) await db.user.delete({ where: { id: adminId } });
      }
      await app?.close();
    });

    async function createExternal(label: string) {
      return body<Person>(
        await request(app.getHttpServer())
          .post('/people')
          .auth(token, { type: 'bearer' })
          .send({ name: `${tag} ${label}`, category: 'EXTERNO' })
          .expect(201),
      );
    }

    it('creates and edits a participant without inventing academic credentials or contact details', async () => {
      const person = await createExternal('Ana');
      expect(person).toMatchObject({
        category: 'EXTERNO',
        isActive: true,
        email: null,
        academicTitle: null,
        institution: null,
        nationality: null,
      });
      const updated = body<Person>(
        await request(app.getHttpServer())
          .patch(`/people/${person.id}`)
          .auth(token, { type: 'bearer' })
          .send({
            category: 'EXTERNO',
            bio: 'Participante do júri.',
            email: '',
            academicTitleId: '',
            institutionId: '',
            nationalityId: '',
          })
          .expect(200),
      );
      expect(updated).toMatchObject({
        id: person.id,
        category: 'EXTERNO',
        email: null,
        academicTitle: null,
        institution: null,
        nationality: null,
      });
    });

    it('accepts multipart forms and still rejects invalid provided profile data', async () => {
      const result = await request(app.getHttpServer())
        .post('/people')
        .auth(token, { type: 'bearer' })
        .field('name', `${tag} Bruno`)
        .field('category', 'EXTERNO')
        .field('isActive', 'true')
        .field('email', '')
        .field('academicTitleId', '')
        .field('institutionId', '')
        .field('nationalityId', '')
        .expect(201);
      expect(body<Person>(result)).toMatchObject({
        category: 'EXTERNO',
        academicTitle: null,
        institution: null,
      });
      await request(app.getHttpServer())
        .post('/people')
        .auth(token, { type: 'bearer' })
        .send({ name: `${tag} invalid`, category: 'EXTERNO', email: 'invalid' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/people')
        .auth(token, { type: 'bearer' })
        .send({
          name: `${tag} invalid`,
          category: 'EXTERNO',
          institutionId: 'invalid',
        })
        .expect(400);
    });

    it('returns external people in every assigned jury role on the public details endpoint', async () => {
      const person = await createExternal('Carla');
      const roles = [
        'judges',
        'jurors',
        'prosecutors',
        'defenders',
        'bailiffs',
      ] as const;
      const created = body<Jury>(
        await request(app.getHttpServer())
          .post('/juries')
          .auth(token, { type: 'bearer' })
          .send({
            title: `${tag} jury`,
            date: '2026-10-25',
            ...Object.fromEntries(roles.map((role) => [role, [person.id]])),
          })
          .expect(201),
      );
      const details = body<Jury>(
        await request(app.getHttpServer())
          .get(`/juries/slug/${created.slug}`)
          .expect(200),
      );
      for (const role of roles)
        expect(details[role]).toEqual([
          expect.objectContaining({
            id: person.id,
            category: 'EXTERNO',
            academicTitle: null,
            institution: null,
          }),
        ]);
    });

    it('filters the researchers directory while keeping external people available in the admin catalog', async () => {
      await createExternal('Daniel');
      const researchers = body<Person[]>(
        await request(app.getHttpServer())
          .get('/people')
          .query({
            search: tag,
            excludeCategory: 'EXTERNO',
            isActive: 'true',
            limit: 100,
          })
          .expect(200),
      );
      expect(researchers.map((person) => person.id)).toEqual([memberId]);
      const admin = body<{ items: Person[]; total: number }>(
        await request(app.getHttpServer())
          .get('/people/paginated')
          .auth(token, { type: 'bearer' })
          .query({ search: tag, category: 'EXTERNO', limit: 100 })
          .expect(200),
      );
      expect(admin.total).toBeGreaterThanOrEqual(1);
      expect(admin.items).toHaveLength(admin.total);
      expect(admin.items.every((person) => person.category === 'EXTERNO')).toBe(
        true,
      );
    });

    it('preserves existing jury links when a previously registered person is reclassified as external', async () => {
      const person = await db.person.create({
        data: {
          name: `${tag} existing`,
          slug: `${tag}-existing`,
          category: 'PESQUISADOR',
        },
      });
      const jury = await db.jury.create({
        data: {
          title: `${tag} existing jury`,
          slug: `${tag}-existing-jury`,
          date: new Date(),
          jurors: { connect: { id: person.id } },
        },
      });
      await request(app.getHttpServer())
        .patch(`/people/slug/${person.slug}`)
        .auth(token, { type: 'bearer' })
        .send({ category: 'EXTERNO' })
        .expect(200);
      const details = body<Jury>(
        await request(app.getHttpServer())
          .get(`/juries/slug/${jury.slug}`)
          .expect(200),
      );
      expect(details.jurors).toEqual([
        expect.objectContaining({ id: person.id, category: 'EXTERNO' }),
      ]);
    });
  },
);
