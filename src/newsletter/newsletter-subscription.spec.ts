import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import type { Server } from 'http';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { NewsletterController } from './newsletter.controller';
import { NewsletterRepository } from './newsletter.repository';
import { NewsletterService } from './newsletter.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NewsletterPdfService } from './pdf/newsletter-pdf.service';
import { NewsletterDocumentsService } from './pdf/newsletter-documents.service';

describe('Public newsletter subscription', () => {
  let app: INestApplication;
  let server: Server;
  const subscribers = new Map<string, Record<string, unknown>>();
  const upsert = jest.fn((args: Prisma.NewsletterSubscriberUpsertArgs) => {
    const email = args.where.email!;
    const existing = subscribers.get(email);
    const subscriber = {
      name: null,
      cellphone: null,
      isActive: true,
      allowEmail: true,
      allowWhatsapp: false,
      ...(existing ?? {}),
      ...(existing ? args.update : args.create),
      id: existing?.id ?? `subscriber-${subscribers.size + 1}`,
    };
    subscribers.set(email, subscriber);
    return Promise.resolve({ id: subscriber.id });
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        NewsletterService,
        NewsletterRepository,
        { provide: CloudinaryService, useValue: {} },
        { provide: NewsletterPdfService, useValue: {} },
        { provide: NewsletterDocumentsService, useValue: {} },
        {
          provide: PrismaService,
          useValue: { newsletterSubscriber: { upsert } },
        },
      ],
    }).compile();
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
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    subscribers.clear();
    upsert.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts an email without authentication or optional fields', async () => {
    await request(server)
      .post('/newsletter/subscribe')
      .send({ email: '  Pessoa@Example.com  ' })
      .expect(200, { message: 'Inscrição realizada com sucesso.' });

    expect(subscribers.get('pessoa@example.com')).toEqual(
      expect.objectContaining({
        email: 'pessoa@example.com',
        name: null,
        cellphone: null,
        allowWhatsapp: false,
      }),
    );
  });

  it.each([
    {},
    { email: '' },
    { email: '   ' },
    { email: 'invalido' },
    { email: 123 },
    { email: 'pessoa@example.com', name: 123 },
    { email: 'pessoa@example.com', cellphone: 123 },
    { email: 'pessoa@example.com', name: 'a'.repeat(256) },
    { email: 'pessoa@example.com', cellphone: '1'.repeat(31) },
    { email: 'pessoa@example.com', allowWhatsapp: true },
  ])('rejects invalid input before saving: %j', async (body) => {
    await request(server).post('/newsletter/subscribe').send(body).expect(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('saves optional details and preserves them on an email-only retry', async () => {
    await request(server)
      .post('/newsletter/subscribe')
      .send({
        email: 'Pessoa@Example.com',
        name: '  Ana D’Ávila  ',
        cellphone: '  (16) 99999-0000  ',
      })
      .expect(200);
    await request(server)
      .post('/newsletter/subscribe')
      .send({ email: ' pessoa@example.com ', name: '', cellphone: ' ' })
      .expect(200);

    expect(subscribers.size).toBe(1);
    expect(subscribers.get('pessoa@example.com')).toEqual(
      expect.objectContaining({
        name: 'Ana D’Ávila',
        cellphone: '(16) 99999-0000',
      }),
    );
  });

  it('allows an inactive subscriber to request email again', async () => {
    subscribers.set('pessoa@example.com', {
      id: 'existing',
      email: 'pessoa@example.com',
      name: 'Ana',
      isActive: false,
      allowEmail: false,
      allowWhatsapp: false,
      unsubscribedAt: new Date(),
      deletedAt: new Date(),
    });
    await request(server)
      .post('/newsletter/subscribe')
      .send({ email: 'pessoa@example.com' })
      .expect(200);
    expect(subscribers.get('pessoa@example.com')).toEqual(
      expect.objectContaining({
        id: 'existing',
        name: 'Ana',
        isActive: true,
        allowEmail: true,
        allowWhatsapp: false,
        unsubscribedAt: null,
        deletedAt: null,
      }),
    );
  });

  it('returns a failure when saving fails', async () => {
    upsert.mockRejectedValueOnce(new Error('Database unavailable'));
    await request(server)
      .post('/newsletter/subscribe')
      .send({ email: 'pessoa@example.com' })
      .expect(500);
    expect(subscribers.size).toBe(0);
  });
});
