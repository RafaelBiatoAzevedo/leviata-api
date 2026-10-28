import { randomUUID } from 'node:crypto';
import {
  INestApplication,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
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
import { NewsletterModule } from '../src/newsletter/newsletter.module';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';
import { newsletterContent } from './fixtures/newsletter-content';
import type { NewsletterContentDto } from '../src/newsletter/DTOs/newsletter-content.dto';
import { NewsletterPdfService } from '../src/newsletter/pdf/newsletter-pdf.service';

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
              attachments?: {
                filename: string;
                content: Buffer;
                contentType: string;
              }[];
            },
          ]
        >()
        .mockResolvedValue({ messageId: 'fake-smtp-message' }),
    };
    const cloudinary = {
      upload: jest.fn().mockResolvedValue({
        secure_url: 'https://example.test/permanent-cover.png',
        public_id: 'mocked-newsletter-image',
      }),
    };
    const pdf = {
      render: jest.fn((html: string) =>
        Promise.resolve(Buffer.from(`%PDF-1.7\n${html}`)),
      ),
    };

    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.MAIL_TEST_DATABASE_URL;
      process.env.JWT_SECRET = 'mail-integration-jwt-test-secret';
      const module = await Test.createTestingModule({
        imports: [PrismaModule, AuthModule, MailModule, NewsletterModule],
      })
        .overrideProvider(MailConfig)
        .useValue(new MailConfig(config))
        .overrideProvider(MailService)
        .useValue(smtp)
        .overrideProvider(CloudinaryService)
        .useValue(cloudinary)
        .overrideProvider(NewsletterPdfService)
        .useValue(pdf)
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
      cloudinary.upload.mockClear();
      pdf.render.mockClear();
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

    it('protects draft previews and content uploads with authentication', async () => {
      await request(app.getHttpServer())
        .post('/newsletter/preview')
        .send({})
        .expect(401);
      await request(app.getHttpServer()).post('/newsletter/images').expect(401);
    });

    it('uploads a validated content image using mocked storage', async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=',
        'base64',
      );
      const response = await post('/newsletter/images')
        .attach('image', png, {
          filename: 'imagem.png',
          contentType: 'image/png',
        })
        .expect(201);
      expect(readBody<{ url: string }>(response).url).toBe(
        'https://example.test/permanent-cover.png',
      );
      expect(cloudinary.upload).toHaveBeenCalledTimes(1);
    });

    it('previews a local visual draft without saving or uploading it', async () => {
      const count = await db.newsletter.count();
      const response = await post('/newsletter/preview')
        .send({
          title: '',
          subject: '',
          publishedAt: '',
          sentAt: '',
          htmlContent: '',
          contentData: newsletterContent(),
          coverUrl: 'blob:local-crop',
        })
        .expect(200);
      expect(readBody<{ htmlContent: string }>(response).htmlContent).toContain(
        'blob:local-crop',
      );
      expect(await db.newsletter.count()).toBe(count);
      expect(cloudinary.upload).not.toHaveBeenCalled();
      expect(smtp.send).not.toHaveBeenCalled();
    });

    it('saves and reopens structured sections, renders them on the server and preserves them on update', async () => {
      const created = await post('/newsletter')
        .send({
          title: `${tag} visual edition`,
          subject: 'Boletim de junho',
          contentData: newsletterContent(),
        })
        .expect(201);
      const saved = readBody<{
        id: string;
        slug: string;
        htmlContent: string;
        contentData: NewsletterContentDto;
      }>(created);
      expect(saved.htmlContent).toContain('Encontro de pesquisadores');
      expect(saved.contentData.template).toBe('MAGAZINE');
      expect(created.body).not.toHaveProperty('pdfContent');
      expect(created.body).toHaveProperty(
        'pdfUrl',
        `/newsletter/${saved.id}/pdf`,
      );
      await request(app.getHttpServer())
        .get(`/newsletter/${saved.id}/pdf`)
        .expect(404);
      const document = await request(app.getHttpServer())
        .get(`/newsletter/${saved.id}/pdf`)
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(document.headers['content-type']).toContain('application/pdf');
      expect(document.headers['content-disposition']).toContain('.pdf');
      const reopened = await request(app.getHttpServer())
        .get(`/newsletter/slug/${saved.slug}`)
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(
        readBody<{ contentData: NewsletterContentDto }>(reopened).contentData,
      ).toEqual(newsletterContent());
      const contentData = newsletterContent();
      contentData.template = 'CLASSIC';
      contentData.sections[0].items[0].text = 'Texto revisado e persistido.';
      const changed = await request(app.getHttpServer())
        .patch(`/newsletter/slug/${saved.slug}`)
        .auth(token, { type: 'bearer' })
        .send({ contentData })
        .expect(200);
      expect(readBody<{ htmlContent: string }>(changed).htmlContent).toContain(
        'Texto revisado e persistido.',
      );
      expect(
        await db.newsletterDelivery.count({
          where: { newsletterId: saved.id },
        }),
      ).toBe(0);
      expect(smtp.send).not.toHaveBeenCalled();
    });

    it('accepts multipart content and renders the uploaded permanent cover, including subsequent changes', async () => {
      const response = await post('/newsletter')
        .field('title', `${tag} multipart edition`)
        .field('subject', 'Edição com capa')
        .field('contentData', JSON.stringify(newsletterContent()))
        .attach('cover', Buffer.from('image handled by mocked storage'), {
          filename: 'cover.png',
          contentType: 'image/png',
        })
        .expect(201);
      const saved = readBody<{ id: string; slug: string; htmlContent: string }>(
        response,
      );
      expect(saved.htmlContent).toContain(
        'https://example.test/permanent-cover.png',
      );
      expect(saved.htmlContent).not.toContain('blob:');
      cloudinary.upload.mockResolvedValueOnce({
        secure_url: 'https://example.test/revised-cover.png',
        public_id: 'mocked-newsletter-image',
      });
      await request(app.getHttpServer())
        .patch(`/newsletter/slug/${saved.slug}/cover`)
        .auth(token, { type: 'bearer' })
        .attach('cover', Buffer.from('mock storage image'), {
          filename: 'new.png',
          contentType: 'image/png',
        })
        .expect(200);
      const updated = await db.newsletter.findUniqueOrThrow({
        where: { id: saved.id },
      });
      expect(updated.htmlContent).toContain(
        'https://example.test/revised-cover.png',
      );
      expect(updated.contentData).toEqual(newsletterContent());
      expect(Buffer.from(updated.pdfContent!).toString()).toContain(
        'https://example.test/revised-cover.png',
      );
    });

    it('retains advanced HTML source with its editable cover placeholder', async () => {
      const contentData = newsletterContent();
      contentData.mode = 'html';
      contentData.customHtml =
        '<h1>Código personalizado</h1><img src="{{newsletterCover}}">';
      const response = await post('/newsletter')
        .send({
          title: `${tag} advanced edition`,
          subject: 'Personalizada',
          contentData,
          coverUrl: 'https://example.test/capa.png',
        })
        .expect(201);
      const saved = readBody<{
        htmlContent: string;
        contentData: NewsletterContentDto;
      }>(response);
      expect(saved.htmlContent).toContain(
        'src="https://example.test/capa.png"',
      );
      expect(saved.contentData.customHtml).toContain('{{newsletterCover}}');
      expect(saved.contentData.sections).toEqual(contentData.sections);
    });

    it('downloads a published PDF without login and reuses its generated bytes', async () => {
      const edition = await newsletter();
      await request(app.getHttpServer())
        .get(`/newsletter/${edition.id}/pdf`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/newsletter/${edition.id}/pdf`)
        .expect(200);
      expect(pdf.render).toHaveBeenCalledTimes(1);
      const saved = await db.newsletter.findUniqueOrThrow({
        where: { id: edition.id },
      });
      expect(saved.pdfContent).toBeTruthy();
      expect(saved.pdfGeneratedAt).toBeInstanceOf(Date);
      await db.newsletter.update({
        where: { id: edition.id },
        data: { deletedAt: new Date() },
      });
      await request(app.getHttpServer())
        .get(`/newsletter/${edition.id}/pdf`)
        .expect(404);
    });

    it('keeps the saved edition intact when PDF generation fails and rejects a manual PDF URL', async () => {
      const edition = await newsletter();
      pdf.render.mockRejectedValueOnce(
        new ServiceUnavailableException('Falha simulada no PDF'),
      );
      await request(app.getHttpServer())
        .patch(`/newsletter/slug/${edition.slug}`)
        .auth(token, { type: 'bearer' })
        .send({ htmlContent: '<p>Uma alteração</p>' })
        .expect(503);
      expect(
        (await db.newsletter.findUniqueOrThrow({ where: { id: edition.id } }))
          .htmlContent,
      ).toBe(edition.htmlContent);
      await post('/newsletter')
        .send({
          title: `${tag} manual PDF`,
          subject: 'Assunto',
          htmlContent: '<p>Texto</p>',
          pdfUrl: 'https://example.test/manual.pdf',
        })
        .expect(400);
    });

    it('rejects malformed nested content and empty editions before writing', async () => {
      const count = await db.newsletter.count();
      for (const contentData of [
        'bad json',
        [],
        { ...newsletterContent(), template: 'invalid' },
        { ...newsletterContent(), sections: [] },
      ]) {
        await post('/newsletter')
          .send({ title: `${tag} invalid`, subject: 'Assunto', contentData })
          .expect(400);
      }
      expect(await db.newsletter.count()).toBe(count);
      expect(cloudinary.upload).not.toHaveBeenCalled();
    });
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
      await request(app.getHttpServer())
        .get(`/mail/newsletters/${edition.id}/subscribers`)
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
      expect(message.attachments).toHaveLength(1);
      expect(message.attachments![0].contentType).toBe('application/pdf');
      expect(message.attachments![0].content.toString()).toContain(
        'Texto original da edição',
      );
      expect(message.attachments![0].content.toString()).not.toContain(
        'Texto alterado',
      );
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
