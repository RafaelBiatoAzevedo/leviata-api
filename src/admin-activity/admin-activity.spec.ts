import { CallHandler, ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { Role, type AdminActivity } from '@prisma/client';
import { firstValueFrom, of, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailConfig } from '../mail/mail.config';
import { MailService } from '../mail/mail.service';
import { SuperAdminGuard } from '../users/super-admin.guard';
import {
  activityData,
  activityMessage,
  type ActivityRequest,
} from './admin-activity.data';
import { AdminActivityService } from './admin-activity.service';
import { AdminActivityInterceptor } from './admin-activity.interceptor';
import { AdminActivityController } from './admin-activity.controller';

const request = (extra: Partial<ActivityRequest> = {}): ActivityRequest => ({
  user: {
    id: 'administrator',
    email: 'editor@example.test',
    role: Role.ADMIN,
    firstName: 'Maria',
    lastName: 'Silva',
  },
  method: 'PATCH',
  url: '/books/slug/history',
  body: { title: 'História', year: 2026, authors: ['author-id'] },
  ...extra,
});
const record = (): AdminActivity => ({
  id: 'activity-id',
  actorId: 'administrator',
  actorEmail: 'editor@example.test',
  actorName: 'Maria Silva',
  method: 'PATCH',
  path: '/books/slug/history',
  outcome: 'SUCCEEDED',
  details: {
    submitted: { year: 2026 },
    saved: { id: 'book-id', title: '<script>História</script>', year: 2026 },
  },
  status: 'PENDING',
  createdAt: new Date('2026-11-02T15:00:00Z'),
  completedAt: new Date('2026-11-02T15:00:01Z'),
  sentAt: null,
  lastAttemptAt: null,
  nextAttemptAt: new Date(),
  attempts: 0,
  errorCode: null,
});
const config = (extra: Record<string, string> = {}) =>
  new MailConfig(
    new ConfigService({
      MAIL_ENABLED: 'true',
      MAIL_WORKER_ENABLED: 'false',
      MAIL_AUTH_MODE: 'app-password',
      MAIL_GMAIL_APP_PASSWORD: 'fake-password',
      MAIL_UNSUBSCRIBE_SECRET: 'test-only-secret-with-more-than-32-characters',
      MAIL_FROM_EMAIL: 'principal@example.test',
      MAIL_SMTP_USER: 'principal@example.test',
      ...extra,
    }),
  );

function harness(extra: Record<string, string> = {}) {
  const table = {
    create: jest.fn().mockResolvedValue(record()),
    update: jest.fn().mockResolvedValue(record()),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
    findFirst: jest
      .fn()
      .mockImplementation((query: { where: { status?: string } }) =>
        Promise.resolve(query.where.status === 'PENDING' ? record() : null),
      ),
    groupBy: jest.fn().mockResolvedValue([]),
  };
  const tx = {
    adminActivity: table,
    $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]),
  };
  const prisma = {
    adminActivity: table,
    $transaction: jest
      .fn()
      .mockImplementation((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
  };
  const mail = { send: jest.fn().mockResolvedValue({ messageId: 'mail-id' }) };
  return {
    table,
    tx,
    mail,
    service: new AdminActivityService(
      prisma as unknown as PrismaService,
      config(extra),
      mail as unknown as MailService,
    ),
  };
}

describe('Administrative audit interception', () => {
  const context = (req: ActivityRequest) =>
    ({ switchToHttp: () => ({ getRequest: () => req }) }) as ExecutionContext;

  it.each(['POST', 'PUT', 'PATCH'])(
    'reserves and persists %s data only after successful changes',
    async (method) => {
      const { service, table } = harness();
      const saved = {
        id: 'book-id',
        title: 'História',
        year: 2026,
        authors: [{ name: 'Autora' }],
      };
      const handler = { handle: jest.fn().mockReturnValue(of(saved)) };
      expect(
        await firstValueFrom(
          new AdminActivityInterceptor(service).intercept(
            context(request({ method })),
            handler,
          ),
        ),
      ).toEqual(saved);
      expect(table.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorEmail: 'editor@example.test',
          method,
          details: expect.objectContaining({
            submitted: expect.objectContaining({ year: 2026 }),
          }),
        }),
      });
      expect(table.update).toHaveBeenCalledWith({
        where: { id: 'activity-id' },
        data: expect.objectContaining({
          status: 'PENDING',
          outcome: 'SUCCEEDED',
          details: expect.objectContaining({ saved }),
        }),
      });
      expect(table.create.mock.invocationCallOrder[0]).toBeLessThan(
        handler.handle.mock.invocationCallOrder[0],
      );
    },
  );

  it('does not perform an untracked mutation if reserving the audit fails', async () => {
    const { service, table } = harness();
    table.create.mockRejectedValueOnce(new Error('Database unavailable'));
    const handler = { handle: jest.fn().mockReturnValue(of({})) };
    await expect(
      firstValueFrom(
        new AdminActivityInterceptor(service).intercept(
          context(request()),
          handler,
        ),
      ),
    ).rejects.toThrow('Database unavailable');
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('records rejected writes without queueing a success email or changing the original error', async () => {
    const { service, table } = harness();
    const error = new Error('Invalid record');
    const handler: CallHandler = { handle: () => throwError(() => error) };
    await expect(
      firstValueFrom(
        new AdminActivityInterceptor(service).intercept(
          context(request()),
          handler,
        ),
      ),
    ).rejects.toBe(error);
    expect(table.update).toHaveBeenCalledWith({
      where: { id: 'activity-id' },
      data: expect.objectContaining({ status: 'ACTION_FAILED' }),
    });
  });

  it.each([
    request({ method: 'GET' }),
    request({ method: 'HEAD' }),
    request({
      user: {
        id: 'super',
        email: 'super@example.test',
        role: Role.SUPER_ADMIN,
      },
    }),
    request({ url: '/auth/logout', method: 'POST' }),
    request({ url: '/newsletter/preview', method: 'POST' }),
    request({ url: '/mail/verify', method: 'POST' }),
  ])(
    'does not audit reads, superadministrators, sessions or unsaved previews (%j)',
    async (req) => {
      const { service, table } = harness();
      await firstValueFrom(
        new AdminActivityInterceptor(service).intercept(context(req), {
          handle: () => of({}),
        }),
      );
      expect(table.create).not.toHaveBeenCalled();
    },
  );

  it('captures multipart fields and file metadata after upload, excluding raw bytes and secrets', async () => {
    const { service, table } = harness();
    const req = request({ method: 'POST', url: '/news', body: undefined });
    const handler = {
      handle: () => {
        req.body = { title: 'Notícia', password: 'do-not-mail' };
        req.file = {
          originalname: 'capa.png',
          mimetype: 'image/png',
          size: 10,
          buffer: Buffer.from('secret bytes'),
        } as Express.Multer.File;
        return of({
          id: 'news-id',
          coverUrl: 'https://example.test/cover.png',
        });
      },
    };
    await firstValueFrom(
      new AdminActivityInterceptor(service).intercept(context(req), handler),
    );
    const data = JSON.stringify(table.update.mock.calls);
    expect(data).toContain('capa.png');
    expect(data).toContain('cover.png');
    expect(data).not.toContain('do-not-mail');
    expect(data).not.toContain('secret bytes');
  });
});

describe('Administrative email delivery', () => {
  it('mails only the configured newsletter sender and persists successful delivery', async () => {
    const { service, mail, table } = harness();
    expect(await service.processNext()).toBe(true);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'principal@example.test',
        subject: '[Leviatã] Edição: Livro',
        text: expect.stringContaining('editor@example.test'),
      }),
    );
    expect(mail.send.mock.calls[0][0].html).not.toContain('<script>');
    expect(mail.send.mock.calls[0][0].html).toContain('&lt;script&gt;');
    expect(table.update).toHaveBeenCalledWith({
      where: { id: 'activity-id' },
      data: expect.objectContaining({
        status: 'SENT',
        sentAt: expect.any(Date),
      }),
    });
  });

  it('keeps queued work when mail is disabled instead of losing notifications', async () => {
    const { service, mail, table } = harness({ MAIL_ENABLED: 'false' });
    expect(await service.processNext()).toBe(false);
    expect(mail.send).not.toHaveBeenCalled();
    expect(table.findFirst).not.toHaveBeenCalled();
  });

  it('retries transient SMTP failures with backoff, but preserves ambiguous delivery for review', async () => {
    for (const [error, status] of [
      [{ code: 'ECONNECTION' }, 'PENDING'],
      [{ code: 'ETIMEDOUT', command: 'DATA' }, 'UNKNOWN'],
    ] as const) {
      const { service, mail, table } = harness();
      mail.send.mockRejectedValueOnce(error);
      await service.processNext();
      expect(table.update).toHaveBeenCalledWith({
        where: { id: 'activity-id' },
        data: expect.objectContaining({
          status,
          nextAttemptAt: expect.any(Date),
        }),
      });
    }
  });

  it('does not duplicate SMTP delivery when the atomic claim was lost', async () => {
    const { service, table, mail } = harness();
    table.updateMany.mockResolvedValue({ count: 0 });
    expect(await service.processNext()).toBe(false);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('retains ambiguous status if SMTP accepted an email but persisting success failed', async () => {
    const { service, table, mail } = harness();
    table.update.mockRejectedValueOnce(new Error('Commit failed'));
    await service.processNext();
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(table.updateMany).toHaveBeenCalledWith({
      where: { id: 'activity-id', status: 'SENDING' },
      data: { status: 'UNKNOWN', errorCode: 'PERSISTENCE_AFTER_SEND' },
    });
  });

  it('recovers interrupted actions for review and never silently re-sends interrupted SMTP attempts', async () => {
    const { service, table } = harness();
    await service.processNext();
    expect(table.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'RECORDING' }),
        data: { status: 'PENDING', outcome: 'UNCONFIRMED' },
      }),
    );
    expect(table.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SENDING' }),
        data: { status: 'UNKNOWN', errorCode: 'INTERRUPTED_SEND' },
      }),
    );
    expect(
      activityMessage({ ...record(), outcome: 'UNCONFIRMED' }).text,
    ).toContain('conclusão não foi confirmada');
  });

  it('retries only failed emails and limits queue operations to superadministrators', async () => {
    const { service, table } = harness();
    await service.retryFailed();
    expect(table.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'FAILED' },
        data: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminActivityController),
    ).toContain(SuperAdminGuard);
  });

  it('redacts nested credentials while keeping relevant data and escaping untrusted HTML', () => {
    const payload = activityData({
      title: 'Livro',
      year: 2026,
      nested: {
        password: 'secret-pw',
        hashedRefreshToken: 'secret-token',
        clientSecret: 'secret-client',
        authors: [{ name: 'Autora' }],
      },
    });
    const serialized = JSON.stringify(payload);
    for (const secret of ['secret-pw', 'secret-token', 'secret-client'])
      expect(serialized).not.toContain(secret);
    expect(serialized).toContain('Autora');
    expect(serialized).toContain('2026');
  });
});
