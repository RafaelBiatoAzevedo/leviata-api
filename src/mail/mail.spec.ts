/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are intentionally typed as any. */
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { MailConfig, MAIL_FROM } from './mail.config';
import { MailService } from './mail.service';
import { MailUnsubscribeService } from './mail-unsubscribe.service';
import { MailUnsubscribeController } from './mail-unsubscribe.controller';
import { PrismaService } from '../prisma/prisma.service';
import { mailFailure } from './mail-errors';
import { newsletterMessage } from './mail.template';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

const createTransport = nodemailer.createTransport as jest.Mock<
  unknown,
  [Record<string, unknown>]
>;

export const mailTestEnvironment = {
  MAIL_ENABLED: 'true',
  MAIL_WORKER_ENABLED: 'false',
  MAIL_AUTH_MODE: 'app-password',
  MAIL_GMAIL_APP_PASSWORD: 'unit-test-not-a-real-password',
  MAIL_UNSUBSCRIBE_SECRET:
    'unit-test-unsubscribe-secret-with-more-than-32-characters',
  MAIL_PUBLIC_API_URL: 'https://api.example.test',
  MAIL_PORTAL_URL: 'https://example.test',
};
const configured = (extra: Record<string, string> = {}) =>
  new MailConfig(new ConfigService({ ...mailTestEnvironment, ...extra }));

describe('Mail configuration and transport', () => {
  const transport = {
    sendMail: jest.fn<
      Promise<{ accepted: string[]; messageId: string }>,
      [Record<string, unknown>]
    >(),
    verify: jest.fn(),
    close: jest.fn(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
    createTransport.mockReturnValue(transport);
    transport.sendMail.mockResolvedValue({
      accepted: ['person@example.test'],
      messageId: 'test-message',
    });
    transport.verify.mockResolvedValue(true);
  });

  it('starts disabled and reports missing variable names without exposing credentials', () => {
    const config = configured({
      MAIL_ENABLED: 'false',
      MAIL_GMAIL_APP_PASSWORD: '',
    });
    expect(config.status()).toMatchObject({
      enabled: false,
      ready: false,
      from: MAIL_FROM,
    });
    expect(config.status().missing).toContain('MAIL_GMAIL_APP_PASSWORD');
    expect(JSON.stringify(config.status())).not.toContain(
      mailTestEnvironment.MAIL_UNSUBSCRIBE_SECRET,
    );
  });

  it('blocks sending before configuration, without creating an SMTP connection', async () => {
    const service = new MailService(configured({ MAIL_ENABLED: 'false' }));
    await expect(
      service.send({
        to: 'person@example.test',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('uses Gmail TLS and one private recipient with plaintext and unsubscribe headers', async () => {
    const service = new MailService(configured());
    await service.send({
      to: 'person@example.test',
      subject: 'Newsletter\r\nTitle',
      html: '<p>Hello</p>',
      text: 'Hello',
      unsubscribeUrl: 'https://api.example.test/mail/unsubscribe?token=test',
    });
    const options = createTransport.mock.calls[0][0];
    expect(options).toMatchObject({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      disableFileAccess: true,
      disableUrlAccess: true,
      auth: {
        user: MAIL_FROM,
        pass: mailTestEnvironment.MAIL_GMAIL_APP_PASSWORD,
      },
    });
    const sent = transport.sendMail.mock.calls[0][0];
    expect(sent).toMatchObject({
      from: { address: MAIL_FROM },
      to: 'person@example.test',
      subject: 'Newsletter Title',
      text: 'Hello',
      headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    expect(sent).not.toHaveProperty('cc');
    expect(sent).not.toHaveProperty('bcc');
    service.onApplicationShutdown();
    expect(transport.close).toHaveBeenCalled();
  });

  it('supports Google OAuth2 without using an account password', async () => {
    const service = new MailService(
      configured({
        MAIL_AUTH_MODE: 'oauth2',
        MAIL_GOOGLE_CLIENT_ID: 'client',
        MAIL_GOOGLE_CLIENT_SECRET: 'secret',
        MAIL_GOOGLE_REFRESH_TOKEN: 'refresh',
      }),
    );
    await service.verify();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: {
          type: 'OAuth2',
          user: MAIL_FROM,
          clientId: 'client',
          clientSecret: 'secret',
          refreshToken: 'refresh',
        },
      }),
    );
    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it('does not expose SMTP failures or secrets through the verification endpoint', async () => {
    transport.verify.mockRejectedValue(new Error('password=private-secret'));
    await expect(new MailService(configured()).verify()).rejects.toThrow(
      'Não foi possível validar o SMTP.',
    );
  });

  it('rejects invalid URLs, secret lengths and sending limits', () => {
    const config = configured({
      MAIL_PUBLIC_API_URL: 'file:///etc/passwd',
      MAIL_UNSUBSCRIBE_SECRET: 'short',
      MAIL_DAILY_LIMIT: '10000',
    });
    expect(config.status().missing).toEqual(
      expect.arrayContaining([
        'MAIL_PUBLIC_API_URL',
        'MAIL_UNSUBSCRIBE_SECRET',
        'MAIL_DAILY_LIMIT',
      ]),
    );
    expect(() => config.requireReady()).toThrow(ServiceUnavailableException);
  });
});

describe('Newsletter rendering and unsubscribe', () => {
  const subscriber = {
    id: 'd34d4663-f8d9-4f29-a757-eae70d07efa7',
    email: 'person@example.test',
  };
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const prisma = {
    newsletterSubscriber: { updateMany },
  } as unknown as PrismaService;
  const unsubscribe = new MailUnsubscribeService(configured(), prisma);
  beforeEach(() => updateMany.mockClear());

  it('preserves existing HTML documents and adds a footer and a readable plaintext alternative', () => {
    const message = newsletterMessage({
      title: '<Boletim>',
      htmlContent:
        '<!doctype html><html><body><h1>Pesquisa &amp; História</h1><p>Texto completo.</p></body></html>',
      portalUrl: 'https://example.test/noticias/newsletter',
      unsubscribeUrl: unsubscribe.link(subscriber),
    });
    expect(message.html.match(/<body>/g) || []).toHaveLength(1);
    expect(message.html.indexOf('Cancelar inscrição')).toBeLessThan(
      message.html.indexOf('</body>'),
    );
    expect(message.text.toLowerCase()).toContain('pesquisa & história');
    expect(message.text).toContain('Texto completo.');
    expect(message.text).toContain('Cancelar inscrição');
  });

  it('signs links for the specific subscriber and rejects token tampering', () => {
    const url = new URL(unsubscribe.link(subscriber));
    const token = url.searchParams.get('token')!;
    expect(unsubscribe.verify(token)).toEqual(subscriber);
    expect(() => unsubscribe.verify(`x${token}`)).toThrow(
      'Link de descadastro inválido.',
    );
    const other = new MailUnsubscribeService(
      configured({
        MAIL_UNSUBSCRIBE_SECRET:
          'another-test-secret-with-at-least-32-characters',
      }),
      prisma,
    );
    expect(() => other.verify(token)).toThrow();
  });

  it('shows confirmation on GET without changing consent and POST affects email consent only', async () => {
    const controller = new MailUnsubscribeController(unsubscribe);
    const token = new URL(unsubscribe.link(subscriber)).searchParams.get(
      'token',
    )!;
    expect(controller.confirm({ token })).toContain('method="post"');
    expect(updateMany).not.toHaveBeenCalled();
    await controller.remove({ token });
    expect(updateMany).toHaveBeenCalledWith({
      where: { ...subscriber, deletedAt: null, allowEmail: true },
      data: { allowEmail: false, unsubscribedAt: expect.any(Date) },
    });
  });
});

describe('SMTP retry classification', () => {
  it('retries explicit transient rejection with backoff', () => {
    expect(
      mailFailure({ code: 'ESMTP', responseCode: 451 }, 1, 3),
    ).toMatchObject({
      status: 'PENDING',
      errorCode: 'ESMTP_451',
      nextAttemptAt: expect.any(Date),
    });
    expect(mailFailure({ code: 'ESMTP', responseCode: 451 }, 3, 3).status).toBe(
      'FAILED',
    );
  });
  it('does not repeat permanent rejection or ambiguous DATA timeouts', () => {
    expect(
      mailFailure({ code: 'EENVELOPE', responseCode: 550 }, 1, 3).status,
    ).toBe('FAILED');
    expect(
      mailFailure({ code: 'ETIMEDOUT', command: 'DATA' }, 1, 3).status,
    ).toBe('UNKNOWN');
    expect(
      mailFailure({ code: 'ECONNRESET', command: 'CONN' }, 1, 3).status,
    ).toBe('PENDING');
  });
});
