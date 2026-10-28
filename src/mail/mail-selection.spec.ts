import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NewsletterDocumentsService } from '../newsletter/pdf/newsletter-documents.service';
import {
  NewsletterPdfService,
  newsletterPdfHash,
} from '../newsletter/pdf/newsletter-pdf.service';
import { MailConfig } from './mail.config';
import { MailAudienceQueryDto, MailSendDto } from './mail.dto';
import { MailNewslettersService } from './mail-newsletters.service';
import { MailService } from './mail.service';
import { MailUnsubscribeService } from './mail-unsubscribe.service';

const subscriberId = '550e8400-e29b-41d4-a716-446655440000';
const otherId = '550e8400-e29b-41d4-a716-446655440001';

describe('Newsletter recipient request validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('keeps legacy empty requests as ALL and accepts an explicit selection', async () => {
    const all = (await pipe.transform(undefined, {
      type: 'body',
      metatype: MailSendDto,
    })) as MailSendDto;
    expect(all.mode).toBe('ALL');
    const selected = (await pipe.transform(
      { mode: 'SELECTED', subscriberIds: [subscriberId] },
      { type: 'body', metatype: MailSendDto },
    )) as MailSendDto;
    expect(selected.subscriberIds).toEqual([subscriberId]);
  });

  it.each([
    { mode: 'SELECTED' },
    { mode: 'SELECTED', subscriberIds: [] },
    { mode: 'SELECTED', subscriberIds: null },
    { mode: 'SELECTED', subscriberIds: [subscriberId, subscriberId] },
    { mode: 'SELECTED', subscriberIds: ['invalid'] },
    { mode: null },
    { mode: 'unknown' },
    { mode: 'SELECTED', email: 'someone@example.test' },
  ])(
    'rejects malformed selections instead of treating them as ALL: %j',
    async (body) => {
      await expect(
        pipe.transform(body, { type: 'body', metatype: MailSendDto }),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('validates pagination and search before listing names or addresses', async () => {
    const invalid = plainToInstance(MailAudienceQueryDto, {
      page: '0',
      limit: '101',
      search: 'x'.repeat(201),
    });
    expect(
      (await validate(invalid)).map(({ property }) => property).sort(),
    ).toEqual(['limit', 'page', 'search']);
    const valid = plainToInstance(MailAudienceQueryDto, { search: '  Ana  ' });
    expect(await validate(valid)).toEqual([]);
    expect(valid.search).toBe('Ana');
  });
});

describe('Newsletter selected audience', () => {
  const html = '<p>Snapshot da edição</p>';
  const newsletter = {
    id: 'edition',
    title: 'Edição',
    slug: 'edicao',
    subject: 'Assunto',
    htmlContent: html,
    publishedAt: new Date('2020-01-01'),
    sentAt: null,
    pdfContent: new Uint8Array([37, 80, 68, 70]),
    pdfSourceHash: newsletterPdfHash(html),
  };
  const db = {
    newsletter: { findFirst: jest.fn() },
    newsletterSubscriber: {
      findMany: jest.fn<
        Promise<{ id: string; name: string | null; email: string }[]>,
        [Prisma.NewsletterSubscriberFindManyArgs]
      >(),
    },
    newsletterMailCampaign: { findUnique: jest.fn(), create: jest.fn() },
    newsletterMailRecipient: {
      createMany: jest.fn<
        Promise<{ count: number }>,
        [Prisma.NewsletterMailRecipientCreateManyArgs]
      >(),
    },
  };
  const prisma = {
    ...db,
    $transaction: async <T>(
      action: (tx: Prisma.TransactionClient) => Promise<T>,
    ) => action(db as unknown as Prisma.TransactionClient),
  };
  const documents = { ensure: jest.fn() };
  const mail = { send: jest.fn() };
  const config = new MailConfig(
    new ConfigService({
      MAIL_ENABLED: 'true',
      MAIL_AUTH_MODE: 'app-password',
      MAIL_GMAIL_APP_PASSWORD: 'unit-test-placeholder',
      MAIL_UNSUBSCRIBE_SECRET:
        'unit-test-secret-more-than-thirty-two-characters',
    }),
  );
  let service: MailNewslettersService;

  beforeEach(() => {
    jest.resetAllMocks();
    db.newsletter.findFirst.mockResolvedValue(newsletter);
    db.newsletterMailCampaign.findUnique.mockResolvedValue(null);
    db.newsletterMailCampaign.create.mockResolvedValue({ id: 'campaign' });
    db.newsletterSubscriber.findMany.mockResolvedValue([
      { id: subscriberId, name: 'Ana', email: 'ana@example.test' },
    ]);
    service = new MailNewslettersService(
      prisma as unknown as PrismaService,
      config,
      mail as unknown as MailService,
      {} as MailUnsubscribeService,
      documents as unknown as NewsletterDocumentsService,
      {} as NewsletterPdfService,
    );
    jest
      .spyOn(service, 'status')
      .mockResolvedValue({ status: 'NOT_QUEUED', campaign: null });
  });

  it('queues only selected IDs with the same eligibility rules as sending to all', async () => {
    await service.enqueue('edition', 'admin', {
      mode: 'SELECTED',
      subscriberIds: [subscriberId],
    });
    expect(db.newsletterSubscriber.findMany.mock.calls[0][0].where).toEqual({
      id: { in: [subscriberId] },
      isActive: true,
      allowEmail: true,
      deletedAt: null,
      deliveries: { none: { newsletterId: 'edition', errorMessage: null } },
    });
    expect(db.newsletterMailRecipient.createMany).toHaveBeenCalledWith({
      data: [
        { campaignId: 'campaign', subscriberId, email: 'ana@example.test' },
      ],
    });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('does not restrict IDs in the legacy ALL mode', async () => {
    await service.enqueue('edition', 'admin');
    expect(
      db.newsletterSubscriber.findMany.mock.calls[0][0].where,
    ).not.toHaveProperty('id');
  });

  it('rejects an outdated or ineligible selection before creating a campaign', async () => {
    await expect(
      service.enqueue('edition', 'admin', {
        mode: 'SELECTED',
        subscriberIds: [subscriberId, otherId],
      }),
    ).rejects.toThrow('não estão aptos');
    expect(db.newsletterMailCampaign.create).not.toHaveBeenCalled();
    expect(db.newsletterMailRecipient.createMany).not.toHaveBeenCalled();
  });

  it.each([
    { mode: 'SELECTED' as const, subscriberIds: [] },
    { mode: 'ALL' as const, subscriberIds: [subscriberId] },
  ])(
    'never broadens an ambiguous selection into all recipients: %j',
    async (dto) => {
      await expect(service.enqueue('edition', 'admin', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(documents.ensure).not.toHaveBeenCalled();
      expect(db.newsletterMailCampaign.create).not.toHaveBeenCalled();
    },
  );

  it('preserves idempotency and the recipients of an existing campaign', async () => {
    db.newsletterMailCampaign.findUnique.mockResolvedValue({ id: 'existing' });
    await service.enqueue('edition', 'admin', {
      mode: 'SELECTED',
      subscriberIds: [subscriberId],
    });
    expect(db.newsletterSubscriber.findMany).not.toHaveBeenCalled();
    expect(db.newsletterMailRecipient.createMany).not.toHaveBeenCalled();
  });

  it('filters invalid addresses before pagination and searches by name or email', async () => {
    db.newsletterSubscriber.findMany.mockResolvedValue([
      { id: 'invalid', name: null, email: 'invalid' },
      { id: subscriberId, name: 'Ana', email: 'ana@example.test' },
      { id: otherId, name: 'Ana Silva', email: 'ana.silva@example.test' },
    ]);
    const page = await service.subscribers('edition', {
      page: 2,
      limit: 1,
      search: 'Ana',
    });
    expect(page).toEqual({
      items: [
        { id: otherId, name: 'Ana Silva', email: 'ana.silva@example.test' },
      ],
      total: 2,
      page: 2,
      limit: 1,
    });
    expect(db.newsletterSubscriber.findMany.mock.calls[0][0].where?.OR).toEqual(
      [
        { name: { contains: 'Ana', mode: 'insensitive' } },
        { email: { contains: 'Ana', mode: 'insensitive' } },
      ],
    );
  });
});
