import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { MailModule } from '../src/mail/mail.module';
import { MailConfig } from '../src/mail/mail.config';
import { MailService } from '../src/mail/mail.service';
import { MailWorker } from '../src/mail/mail.worker';
import { MailUnsubscribeService } from '../src/mail/mail-unsubscribe.service';
import { MailNewslettersService } from '../src/mail/mail-newsletters.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseDescribe = process.env.MAIL_TEST_DATABASE_URL
  ? describe
  : describe.skip;
const environment = {
  MAIL_ENABLED: 'true',
  MAIL_WORKER_ENABLED: 'false',
  MAIL_AUTH_MODE: 'app-password',
  MAIL_GMAIL_APP_PASSWORD: 'fake-test-password-no-smtp-connection',
  MAIL_UNSUBSCRIBE_SECRET:
    'mail-integration-test-secret-at-least-32-characters',
  MAIL_PUBLIC_API_URL: 'https://api.example.test',
  MAIL_PORTAL_URL: 'https://example.test',
  MAIL_SEND_INTERVAL_MS: '1000',
  MAIL_DAILY_LIMIT: '400',
};
const readBody = <T>(response: { body: unknown }) => response.body as T;

databaseDescribe(
  'Mail API and durable newsletter queue (no external email)',
  () => {
    let app: INestApplication<App>;
    let db: PrismaService;
    let worker: MailWorker;
    let token: string;
    let userId: string;
    let sequence = 0;
    const tag = `mail-e2e-${randomUUID()}`;
    const config = new ConfigService(environment);
    const smtp = {
      verify: jest.fn().mockResolvedValue({ verified: true }),
      send: jest
        .fn<
          Promise<{ messageId: string }>,
          [
            {
              to: string;
              subject: string;
              html: string;
              text: string;
              unsubscribeUrl?: string;
            },
          ]
        >()
        .mockResolvedValue({ messageId: 'fake-smtp-message' }),
    };

    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.MAIL_TEST_DATABASE_URL;
      process.env.JWT_SECRET = 'mail-integration-jwt-test-secret';
      const module = await Test.createTestingModule({
        imports: [PrismaModule, AuthModule, MailModule],
      })
        .overrideProvider(MailConfig)
        .useValue(new MailConfig(config))
        .overrideProvider(MailService)
        .useValue(smtp)
        .compile();
      app = module.createNestApplication();
      app.useLogger(false);
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();
      db = app.get(PrismaService);
      worker = app.get(MailWorker);
      userId = (
        await db.user.create({
          data: {
            email: `${tag}@example.test`,
            password: 'unused-test-hash',
            role: 'ADMIN',
          },
        })
      ).id;
      token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
        sub: userId,
        version: 0,
      });
    }, 20000);

    async function clean() {
      if (!db) return;
      const newsletters = { title: { startsWith: tag } };
      await db.newsletterMailRecipient.deleteMany({
        where: { campaign: { newsletter: newsletters } },
      });
      await db.newsletterMailCampaign.deleteMany({
        where: { newsletter: newsletters },
      });
      await db.newsletterDelivery.deleteMany({
        where: { newsletter: newsletters },
      });
      await db.newsletter.deleteMany({ where: newsletters });
      await db.newsletterSubscriber.deleteMany({
        where: { email: { contains: tag } },
      });
    }
    beforeEach(async () => {
      await clean();
      worker.resume();
      smtp.send
        .mockReset()
        .mockResolvedValue({ messageId: 'fake-smtp-message' });
      smtp.verify.mockClear();
      config.set('MAIL_ENABLED', 'true');
      config.set('MAIL_DAILY_LIMIT', '400');
    });
    afterAll(async () => {
      await clean();
      if (userId) await db.user.delete({ where: { id: userId } });
      await app?.close();
    });

    const subscriber = (extra: Record<string, unknown> = {}) =>
      db.newsletterSubscriber.create({
        data: {
          email: `${tag}-${++sequence}@example.test`,
          ...extra,
        },
      });
    const newsletter = (extra: Record<string, unknown> = {}) =>
      db.newsletter.create({
        data: {
          title: `${tag} edição ${++sequence}`,
          slug: `${tag}-${sequence}`,
          subject: 'Assunto original',
          htmlContent: '<h1>Texto original da edição</h1>',
          publishedAt: new Date('2020-01-01T00:00:00Z'),
          ...extra,
        },
      });
    const post = (path: string) =>
      request(app.getHttpServer()).post(path).auth(token, { type: 'bearer' });
    const queue = (id: string) =>
      post(`/mail/newsletters/${id}/send`).expect(202);
    async function advanceQueue() {
      await db.newsletterMailRecipient.updateMany({
        where: { campaign: { newsletter: { title: { startsWith: tag } } } },
        data: {
          lastAttemptAt: new Date(Date.now() - 5000),
          nextAttemptAt: new Date(Date.now() - 1000),
        },
      });
    }

    it('requires admin authentication and reports configuration without secrets', async () => {
      await request(app.getHttpServer()).get('/mail/status').expect(401);
      const response = await request(app.getHttpServer())
        .get('/mail/status')
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(readBody<{ ready: boolean }>(response).ready).toBe(true);
      expect(JSON.stringify(response.body)).not.toContain(
        environment.MAIL_GMAIL_APP_PASSWORD,
      );
      expect(JSON.stringify(response.body)).not.toContain(
        environment.MAIL_UNSUBSCRIBE_SECRET,
      );
    });

    it('blocks queuing without credentials and sends no email', async () => {
      const edition = await newsletter();
      await subscriber();
      config.set('MAIL_ENABLED', 'false');
      await post(`/mail/newsletters/${edition.id}/send`).expect(503);
      expect(
        await db.newsletterMailCampaign.count({
          where: { newsletterId: edition.id },
        }),
      ).toBe(0);
      expect(smtp.send).not.toHaveBeenCalled();
    });

    it('queues eligible subscribers once and excludes opt-outs, deleted, inactive and historical deliveries', async () => {
      const edition = await newsletter();
      const eligible = await subscriber();
      await subscriber({ allowEmail: false });
      await subscriber({ isActive: false });
      await subscriber({ deletedAt: new Date() });
      const previous = await subscriber();
      await db.newsletterDelivery.create({
        data: {
          newsletterId: edition.id,
          subscriberId: previous.id,
          sentAt: new Date(),
        },
      });
      await request(app.getHttpServer())
        .get(`/mail/newsletters/${edition.id}/audience`)
        .expect(401);
      const audience = await request(app.getHttpServer())
        .get(`/mail/newsletters/${edition.id}/audience`)
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(
        readBody<{ registered: number; eligible: number; excluded: number }>(
          audience,
        ),
      ).toEqual({ registered: 4, eligible: 1, excluded: 3 });
      const historical = await request(app.getHttpServer())
        .get(`/mail/newsletters/${edition.id}/delivery-records`)
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(
        readBody<{ total: number; items: { subscriberId: string }[] }>(
          historical,
        ),
      ).toMatchObject({ total: 1, items: [{ subscriberId: previous.id }] });
      await queue(edition.id);
      await queue(edition.id);
      const recipients = await db.newsletterMailRecipient.findMany({
        where: { campaign: { newsletterId: edition.id } },
      });
      expect(recipients).toHaveLength(1);
      expect(recipients[0].subscriberId).toBe(eligible.id);
      expect(smtp.send).not.toHaveBeenCalled();
    });

    it('keeps the queued content snapshot and marks sentAt only after SMTP acceptance', async () => {
      const edition = await newsletter();
      const recipient = await subscriber();
      await queue(edition.id);
      await db.newsletter.update({
        where: { id: edition.id },
        data: {
          subject: 'Assunto alterado',
          htmlContent: '<p>Texto alterado</p>',
        },
      });
      expect(await worker.processNext()).toBe(true);
      const message = smtp.send.mock.calls[0][0];
      expect(message.to).toBe(recipient.email);
      expect(message.subject).toBe('Assunto original');
      expect(message.html).toContain('Texto original da edição');
      expect(message.html).not.toContain('Texto alterado');
      expect(message.unsubscribeUrl).toContain('/mail/unsubscribe?token=');
      expect(message.text).toContain('Cancelar inscrição');
      expect(
        (await db.newsletter.findUniqueOrThrow({ where: { id: edition.id } }))
          .sentAt,
      ).toBeInstanceOf(Date);
      expect(
        await db.newsletterDelivery.count({
          where: { newsletterId: edition.id },
        }),
      ).toBe(1);
      await worker.processNext();
      expect(smtp.send).toHaveBeenCalledTimes(1);
      const records = await request(app.getHttpServer())
        .get(`/mail/newsletters/${edition.id}/delivery-records`)
        .auth(token, { type: 'bearer' })
        .expect(200);
      const history = readBody<{
        total: number;
        items: {
          id: string;
          subscriberId: string;
          sentAt: string;
          subscriber: { email: string };
        }[];
      }>(records);
      expect(history.total).toBe(1);
      expect(history.items[0].subscriberId).toBe(recipient.id);
      expect(history.items[0].subscriber.email).toBe(recipient.email);
      expect(history.items[0].sentAt).toBeTruthy();
      expect(
        (
          await db.newsletterDelivery.findUniqueOrThrow({
            where: { id: history.items[0].id },
          })
        ).newsletterId,
      ).toBe(edition.id);
    });

    it('supports safe confirmation GET and one-click POST, preserving WhatsApp consent', async () => {
      const edition = await newsletter();
      const recipient = await subscriber({ allowWhatsapp: true });
      await queue(edition.id);
      const link = new URL(app.get(MailUnsubscribeService).link(recipient));
      await request(app.getHttpServer())
        .get(link.pathname + link.search)
        .expect(200);
      expect(
        (
          await db.newsletterSubscriber.findUniqueOrThrow({
            where: { id: recipient.id },
          })
        ).allowEmail,
      ).toBe(true);
      await request(app.getHttpServer())
        .post(link.pathname + link.search)
        .type('form')
        .send('List-Unsubscribe=One-Click')
        .expect(200);
      const stored = await db.newsletterSubscriber.findUniqueOrThrow({
        where: { id: recipient.id },
      });
      expect(stored).toMatchObject({
        allowEmail: false,
        allowWhatsapp: true,
        isActive: true,
      });
      await worker.processNext();
      expect(smtp.send).not.toHaveBeenCalled();
      expect(
        await db.newsletterMailRecipient.count({
          where: { campaign: { newsletterId: edition.id }, status: 'SKIPPED' },
        }),
      ).toBe(1);
      await request(app.getHttpServer())
        .post('/mail/unsubscribe')
        .query({ token: `x${link.searchParams.get('token')}` })
        .expect(400);
    });

    it('retries transient rejection with backoff without duplicating successful delivery', async () => {
      const edition = await newsletter();
      await subscriber();
      await queue(edition.id);
      smtp.send.mockRejectedValueOnce({ code: 'ESMTP', responseCode: 451 });
      await worker.processNext();
      const first = await db.newsletterMailRecipient.findFirstOrThrow({
        where: { campaign: { newsletterId: edition.id } },
      });
      expect(first).toMatchObject({
        status: 'PENDING',
        attempts: 1,
        errorCode: 'ESMTP_451',
      });
      expect(first.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
      expect(await worker.processNext()).toBe(false);
      await advanceQueue();
      await worker.processNext();
      expect(
        await db.newsletterDelivery.count({
          where: { newsletterId: edition.id },
        }),
      ).toBe(1);
      expect(smtp.send).toHaveBeenCalledTimes(2);
    });

    it('preserves ambiguous deliveries for manual review and never retries them automatically', async () => {
      const edition = await newsletter();
      await subscriber();
      await queue(edition.id);
      smtp.send.mockRejectedValueOnce({ code: 'ETIMEDOUT', command: 'DATA' });
      await worker.processNext();
      await post(`/mail/newsletters/${edition.id}/retry`).expect(202);
      await advanceQueue();
      expect(await worker.processNext()).toBe(false);
      expect(
        await db.newsletterMailRecipient.count({
          where: { campaign: { newsletterId: edition.id }, status: 'UNKNOWN' },
        }),
      ).toBe(1);
      expect(smtp.send).toHaveBeenCalledTimes(1);
    });

    it('recovers interrupted sends as unknown instead of sending them again after restart', async () => {
      const edition = await newsletter();
      await subscriber();
      await queue(edition.id);
      await db.newsletterMailRecipient.updateMany({
        where: { campaign: { newsletterId: edition.id } },
        data: {
          status: 'SENDING',
          attempts: 1,
          lastAttemptAt: new Date(Date.now() - 1200000),
        },
      });
      // A new worker simulates a process restart without modifying application internals.
      const restarted = new MailWorker(
        db,
        app.get(MailConfig),
        app.get(MailService),
        app.get(MailNewslettersService),
      );
      await restarted.processNext();
      expect(
        await db.newsletterMailRecipient.count({
          where: { campaign: { newsletterId: edition.id }, status: 'UNKNOWN' },
        }),
      ).toBe(1);
      expect(smtp.send).not.toHaveBeenCalled();
    });

    it('enforces shared rate and rolling daily limits across pending recipients', async () => {
      const edition = await newsletter();
      await subscriber();
      await subscriber();
      config.set('MAIL_DAILY_LIMIT', '1');
      await queue(edition.id);
      await worker.processNext();
      expect(await worker.processNext()).toBe(false);
      await advanceQueue();
      expect(await worker.processNext()).toBe(false);
      expect(smtp.send).toHaveBeenCalledTimes(1);
    });

    it('reserves recipients safely when multiple workers run concurrently', async () => {
      const edition = await newsletter();
      await subscriber();
      await subscriber();
      await queue(edition.id);
      const second = new MailWorker(
        db,
        app.get(MailConfig),
        app.get(MailService),
        app.get(MailNewslettersService),
      );
      await Promise.all([worker.processNext(), second.processNext()]);
      expect(smtp.send).toHaveBeenCalledTimes(1);
      expect(
        await db.newsletterDelivery.count({
          where: { newsletterId: edition.id },
        }),
      ).toBe(1);
    });

    it('pauses authentication failures and resumes after a successful SMTP verification', async () => {
      const edition = await newsletter();
      await subscriber();
      await subscriber();
      await queue(edition.id);
      smtp.send.mockRejectedValueOnce({ code: 'EAUTH', responseCode: 535 });
      await worker.processNext();
      expect(worker.state().pausedUntil).not.toBeNull();
      expect(await worker.processNext()).toBe(false);
      await post('/mail/verify').expect(200);
      expect(worker.state().pausedUntil).toBeNull();
      await advanceQueue();
      await worker.processNext();
      expect(smtp.send).toHaveBeenCalledTimes(2);
    });

    it('cancels pending work and rejects drafts without starting SMTP', async () => {
      const edition = await newsletter();
      await subscriber();
      await queue(edition.id);
      await post(`/mail/newsletters/${edition.id}/cancel`).expect(200);
      expect(await worker.processNext()).toBe(false);
      const draft = await newsletter({ publishedAt: null });
      await post(`/mail/newsletters/${draft.id}/send`).expect(400);
      expect(smtp.send).not.toHaveBeenCalled();
    });
  },
);
