import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { CommentTarget } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { CommentsModule } from '../src/comments/comments.module';
import { CommentsService } from '../src/comments/comments.service';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const readBody = <T>(response: { body: unknown }) => response.body as T;
type PublicPage = {
  total: number;
  items: { id: string; fullName: string; text: string; approvedAt: string }[];
};
type Inbox = { items: { id: string; comment: { fullName: string } | null }[] };

// An explicit test database is required; never fall back to the project's database.
const databaseDescribe = process.env.COMMENTS_TEST_DATABASE_URL
  ? describe
  : describe.skip;
databaseDescribe(
  'Comments and notifications with PostgreSQL and real JWT guards',
  () => {
    let app: INestApplication<App>;
    let db: PrismaService;
    let service: CommentsService;
    let adminId: string;
    let superId: string;
    let adminToken: string;
    let superToken: string;
    let personId: string;
    const tag = `comments-e2e-${randomUUID()}`;
    const targets: { targetType: CommentTarget; targetId: string }[] = [];

    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.COMMENTS_TEST_DATABASE_URL;
      process.env.JWT_SECRET = 'comments-notifications-test-secret';
      const module = await Test.createTestingModule({
        imports: [
          PrismaModule,
          AuthModule,
          CommentsModule,
          NotificationsModule,
        ],
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
      service = app.get(CommentsService);
      const admin = await db.user.create({
        data: {
          email: `${tag}-admin@example.test`,
          password: 'unused-test-hash',
          role: 'ADMIN',
        },
      });
      adminId = admin.id;
      const superadmin = await db.user.create({
        data: {
          email: `${tag}-super@example.test`,
          password: 'unused-test-hash',
          role: 'SUPER_ADMIN',
        },
      });
      superId = superadmin.id;
      const jwt = new JwtService({ secret: process.env.JWT_SECRET });
      adminToken = jwt.sign({ sub: adminId, version: 0 });
      superToken = jwt.sign({ sub: superId, version: 0 });
      const person = await db.person.create({
        data: { name: tag, slug: tag, category: 'PESQUISADOR' },
      });
      personId = person.id;
      const base = { title: tag, slug: tag };
      targets.push({
        targetType: 'THEMATIC',
        targetId: (await db.thematic.create({ data: base })).id,
      });
      for (const type of ['DOSSIER', 'CATALOG', 'DATABASE'] as const)
        targets.push({
          targetType: 'RESEARCH_INSTRUMENT',
          targetId: (
            await db.researchInstrument.create({
              data: { ...base, slug: `${tag}-${type}`, type },
            })
          ).id,
        });
      targets.push({
        targetType: 'BOARD',
        targetId: (
          await db.board.create({
            data: {
              ...base,
              date: new Date(),
              candidateId: personId,
              advisorId: personId,
            },
          })
        ).id,
      });
      targets.push({
        targetType: 'JURY',
        targetId: (
          await db.jury.create({ data: { ...base, date: new Date() } })
        ).id,
      });
      for (const type of ['MEETING', 'SEMINAR', 'DOCUMENTARY'] as const)
        targets.push({
          targetType: 'MEETING',
          targetId: (
            await db.meeting.create({
              data: { ...base, slug: `${tag}-${type}`, date: new Date(), type },
            })
          ).id,
        });
      targets.push({
        targetType: 'PRESENTED_WORK',
        targetId: (
          await db.presentedWork.create({ data: { ...base, date: new Date() } })
        ).id,
      });
      targets.push({
        targetType: 'RESEARCH',
        targetId: (await db.search.create({ data: base })).id,
      });
      for (const isInternal of [true, false]) {
        targets.push({
          targetType: 'NEWS',
          targetId: (
            await db.news.create({
              data: {
                ...base,
                slug: `${tag}-news-${isInternal ? 'internal' : 'external'}`,
                description: 'Notícia para validar comentários moderados.',
                date: new Date(),
                category: 'RESEARCH',
                isInternal,
              },
            })
          ).id,
        });
      }
    }, 20000);

    afterAll(async () => {
      if (db) {
        await db.notification.deleteMany({
          where: {
            OR: [
              { targetTitle: tag },
              { createdById: { in: [adminId, superId].filter(Boolean) } },
            ],
          },
        });
        await db.comment.deleteMany({
          where: { targetId: { in: targets.map((target) => target.targetId) } },
        });
        for (const model of [
          db.board,
          db.jury,
          db.meeting,
          db.presentedWork,
          db.search,
          db.thematic,
          db.researchInstrument,
          db.news,
        ]) {
          await (
            model.deleteMany as (args: {
              where: { title: string };
            }) => Promise<unknown>
          )({ where: { title: tag } });
        }
        if (personId) await db.person.delete({ where: { id: personId } });
        await db.user.deleteMany({
          where: { id: { in: [adminId, superId].filter(Boolean) } },
        });
      }
      if (app) await app.close();
    });

    it('keeps public submissions hidden, denies admin approval, then publishes through superadmin moderation', async () => {
      const target = targets[0];
      await request(app.getHttpServer()).get('/notifications').expect(401);
      await request(app.getHttpServer())
        .get('/notifications/counts')
        .expect(401);
      await request(app.getHttpServer())
        .post('/comments')
        .send({
          ...target,
          fullName: 'Visitante Teste',
          text: 'Uma reflexão para a temática.',
        })
        .expect(201);
      const pending = await db.comment.findFirstOrThrow({
        where: { targetId: target.targetId },
      });
      const notification = await db.notification.findUniqueOrThrow({
        where: { commentId: pending.id },
      });
      const publicBefore = await request(app.getHttpServer())
        .get('/comments')
        .query(target)
        .expect(200);
      expect(readBody<PublicPage>(publicBefore).total).toBe(0);
      const inbox = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        readBody<Inbox>(inbox).items.find(
          (item: { id: string }) => item.id === notification.id,
        )?.comment?.fullName,
      ).toBe('Visitante Teste');
      await request(app.getHttpServer())
        .patch(`/comments/${pending.id}/moderation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approve' })
        .expect(403);
      expect(
        (await db.comment.findUniqueOrThrow({ where: { id: pending.id } }))
          .status,
      ).toBe('PENDING');
      await request(app.getHttpServer())
        .patch(`/comments/${pending.id}/moderation`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ decision: 'approve' })
        .expect(200);
      const publicAfter = await request(app.getHttpServer())
        .get('/comments')
        .query(target)
        .expect(200);
      expect(readBody<PublicPage>(publicAfter).total).toBe(1);
      const publicComment = readBody<PublicPage>(publicAfter).items[0];
      expect(publicComment).toMatchObject({
        id: pending.id,
        fullName: 'Visitante Teste',
        text: 'Uma reflexão para a temática.',
      });
      expect(Number.isFinite(Date.parse(publicComment.approvedAt))).toBe(true);
      expect(Object.keys(publicComment).sort()).toEqual([
        'approvedAt',
        'fullName',
        'id',
        'text',
      ]);
      expect(
        (await db.comment.findUniqueOrThrow({ where: { id: pending.id } }))
          .approvedById,
      ).toBe(superId);
    });

    it('deletes rejected content and detaches it from the notification without retaining its name or text', async () => {
      const target = targets[1];
      await request(app.getHttpServer())
        .post('/comments')
        .send({
          ...target,
          fullName: 'Pessoa Recusada',
          text: 'Texto descartado no teste.',
        })
        .expect(201);
      const pending = await db.comment.findFirstOrThrow({
        where: { targetId: target.targetId },
      });
      const notification = await db.notification.findUniqueOrThrow({
        where: { commentId: pending.id },
      });
      await request(app.getHttpServer())
        .patch(`/comments/${pending.id}/moderation`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ decision: 'reject' })
        .expect(200);
      expect(
        await db.comment.findUnique({ where: { id: pending.id } }),
      ).toBeNull();
      const resolved = await db.notification.findUniqueOrThrow({
        where: { id: notification.id },
      });
      expect(resolved.commentId).toBeNull();
      expect(resolved.resolution).toBe('REJECTED');
      expect(JSON.stringify(resolved)).not.toMatch(
        /Pessoa Recusada|Texto descartado/,
      );
      const publicPage = await request(app.getHttpServer())
        .get('/comments')
        .query(target)
        .expect(200);
      expect(readBody<PublicPage>(publicPage).total).toBe(0);
    });

    it('isolates per-admin read receipts, is idempotent, and keeps future reminders out of the badge', async () => {
      const created = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'INFO',
          title: 'Aviso de teste',
          message: 'Uma mensagem administrativa.',
        })
        .expect(201);
      const id = readBody<{ id: string }>(created).id;
      await request(app.getHttpServer())
        .patch(`/notifications/${id}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/notifications/${id}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        await db.notificationRead.count({ where: { notificationId: id } }),
      ).toBe(1);
      const otherUser = await request(app.getHttpServer())
        .get(`/notifications/${id}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
      expect(readBody<{ readAt: string | null }>(otherUser).readAt).toBeNull();
      const future = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'REMINDER',
          title: 'Lembrete de teste',
          message: 'Visível apenas no futuro.',
          visibleAt: new Date(Date.now() + 3600000).toISOString(),
        })
        .expect(201);
      const inbox = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        readBody<Inbox>(inbox).items.some(
          (item) => item.id === readBody<{ id: string }>(future).id,
        ),
      ).toBe(false);
      const allRead = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const counts = await request(app.getHttpServer())
        .get('/notifications/counts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(readBody<{ count: number }>(allRead).count).toBeGreaterThan(0);
      expect(readBody<{ unreadCount: number }>(counts).unreadCount).toBe(0);
      expect(
        await db.notificationRead.count({
          where: { notificationId: readBody<{ id: string }>(future).id },
        }),
      ).toBe(0);
    });

    it('moderates news comments through the same administrative inbox for internal and external news', async () => {
      const newsTargets = targets.filter(
        (target) => target.targetType === 'NEWS',
      );
      for (const [index, target] of newsTargets.entries()) {
        const decision = index === 0 ? 'approve' : 'reject';
        await request(app.getHttpServer())
          .post('/comments')
          .send({
            ...target,
            fullName: 'Ana Leitora',
            text: 'Contribuição para NEWS com moderação.',
          })
          .expect(201);
        const pending = await db.comment.findFirstOrThrow({
          where: { ...target, status: 'PENDING' },
        });
        const hidden = await request(app.getHttpServer())
          .get('/comments')
          .query(target)
          .expect(200);
        expect(readBody<PublicPage>(hidden).total).toBe(0);
        const notification = await db.notification.findUniqueOrThrow({
          where: { commentId: pending.id },
        });
        const news = await db.news.findUniqueOrThrow({
          where: { id: target.targetId },
        });
        const inboxItem = await request(app.getHttpServer())
          .get(`/notifications/${notification.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        const details = readBody<{
          targetPath: string;
          comment: { fullName: string };
        }>(inboxItem);
        expect(details.targetPath).toBe(`/noticias/${news.slug}`);
        expect(details.comment.fullName).toBe('Ana Leitora');
        await request(app.getHttpServer())
          .patch(`/comments/${pending.id}/moderation`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ decision })
          .expect(403);
        await request(app.getHttpServer())
          .patch(`/comments/${pending.id}/moderation`)
          .set('Authorization', `Bearer ${superToken}`)
          .send({ decision })
          .expect(200);
        const published = await request(app.getHttpServer())
          .get('/comments')
          .query(target)
          .expect(200);
        expect(readBody<PublicPage>(published).total).toBe(
          decision === 'approve' ? 1 : 0,
        );
        const resolved = await db.notification.findUniqueOrThrow({
          where: { id: notification.id },
        });
        expect(resolved.resolution).toBe(
          decision === 'approve' ? 'APPROVED' : 'REJECTED',
        );
        if (decision === 'reject')
          expect(
            await db.comment.findUnique({ where: { id: pending.id } }),
          ).toBeNull();
      }
    });

    it('supports every news, instrument and activity subtype and keeps comments attached to their own records', async () => {
      for (const target of targets) {
        await service.create({
          ...target,
          fullName: 'Visitante Multimodelo',
          text: `Contribuição para ${target.targetType}.`,
        });
        const pending = await db.comment.findFirstOrThrow({
          where: { ...target, status: 'PENDING' },
        });
        await service.moderate(pending.id, { decision: 'approve' }, superId);
        const page = await service.findPublic({
          ...target,
          page: 1,
          limit: 30,
        });
        expect(page.items.some((comment) => comment.id === pending.id)).toBe(
          true,
        );
        expect(
          page.items.every(
            (comment) =>
              comment.text.includes(target.targetType) ||
              comment.text === 'Uma reflexão para a temática.',
          ),
        ).toBe(true);
      }
    });

    it('allows exactly one winner when approve and reject arrive concurrently', async () => {
      const target = targets[0];
      await service.create({
        ...target,
        fullName: 'Visitante Concorrente',
        text: 'Teste de moderação simultânea.',
      });
      const pending = await db.comment.findFirstOrThrow({
        where: { ...target, status: 'PENDING' },
      });
      const results = await Promise.allSettled([
        service.moderate(pending.id, { decision: 'approve' }, superId),
        service.moderate(pending.id, { decision: 'reject' }, superId),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const saved = await db.comment.findUnique({ where: { id: pending.id } });
      if (saved) expect(saved.status).toBe('APPROVED');
    });

    it('blocks new submissions, public listing and approval for deleted news while still allowing rejection', async () => {
      const target = targets.find((item) => item.targetType === 'NEWS')!;
      await service.create({
        ...target,
        fullName: 'Ana Leitora',
        text: 'Comentário pendente antes da exclusão.',
      });
      const pending = await db.comment.findFirstOrThrow({
        where: { ...target, status: 'PENDING' },
      });
      await db.news.update({
        where: { id: target.targetId },
        data: { deletedAt: new Date() },
      });
      await request(app.getHttpServer())
        .get('/comments')
        .query(target)
        .expect(404);
      await request(app.getHttpServer())
        .post('/comments')
        .send({
          ...target,
          fullName: 'Ana Leitora',
          text: 'A notícia já foi excluída.',
        })
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/comments/${pending.id}/moderation`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ decision: 'approve' })
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/comments/${pending.id}/moderation`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ decision: 'reject' })
        .expect(200);
      expect(
        await db.comment.findUnique({ where: { id: pending.id } }),
      ).toBeNull();
    });
  },
);
