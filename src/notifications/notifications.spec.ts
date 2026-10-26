/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest's asymmetric matchers are typed as any. */
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsController } from './notifications.controller';
import {
  CreateNotificationDto,
  NotificationsQueryDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';

describe('Administrative notifications', () => {
  const db = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    notificationRead: { upsert: jest.fn() },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  };
  const service = new NotificationsService(db as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation((work: Promise<unknown>[]) =>
      Promise.all(work),
    );
    db.notification.count.mockResolvedValue(0);
  });

  it('requires JWT authentication and an administrator role on every route', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, NotificationsController),
    ).toEqual([JwtAuthGuard, AdminGuard]);
    const guard = new AdminGuard();
    for (const role of [Role.ADMIN, Role.SUPER_ADMIN])
      expect(
        guard.canActivate({
          switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
        } as ExecutionContext),
      ).toBe(true);
    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({}) }),
      } as ExecutionContext),
    ).toThrow(ForbiddenException);
  });
  it('counts only visible notifications unread by the current user', async () => {
    await service.counts('admin-a');
    expect(db.notification.count).toHaveBeenCalledWith({
      where: {
        visibleAt: { lte: expect.any(Date) },
        reads: { none: { userId: 'admin-a' } },
      },
    });
  });
  it('returns only the current user’s read status, with pending comments available to review', async () => {
    db.notification.findMany.mockResolvedValue([
      { id: 'one', reads: [{ readAt: new Date('2026-10-24T10:00:00Z') }] },
    ]);
    const response = await service.findAll(
      { page: 1, limit: 15, status: 'unread' },
      'admin-b',
    );
    expect(response.items[0]).not.toHaveProperty('reads');
    expect(response.items[0].readAt).toEqual(new Date('2026-10-24T10:00:00Z'));
    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reads: { none: { userId: 'admin-b' } },
        }),
        include: expect.objectContaining({
          reads: { where: { userId: 'admin-b' }, select: { readAt: true } },
        }),
      }),
    );
  });
  it('marks an item idempotently for one user without affecting others', async () => {
    db.notification.findFirst.mockResolvedValue({ id: 'one' });
    await service.markRead('one', 'admin-a');
    expect(db.notificationRead.upsert).toHaveBeenCalledWith({
      where: {
        notificationId_userId: { notificationId: 'one', userId: 'admin-a' },
      },
      create: { notificationId: 'one', userId: 'admin-a' },
      update: {},
      select: { readAt: true },
    });
  });
  it('does not mark future reminders as read', async () => {
    db.notification.findFirst.mockResolvedValue(null);
    await expect(service.markRead('future', 'admin-a')).rejects.toThrow(
      'Notificação não encontrada',
    );
    expect(db.notificationRead.upsert).not.toHaveBeenCalled();
  });
  it('supports reminders with an explicit timezone and rejects ambiguous dates or scheduled INFO notices', async () => {
    await service.create(
      {
        type: 'REMINDER',
        title: 'Revisar',
        message: 'Conferir contribuições',
        visibleAt: '2026-12-10T09:00:00-03:00',
      },
      'admin-a',
    );
    expect(db.notification.create).toHaveBeenCalledWith({
      data: {
        type: 'REMINDER',
        title: 'Revisar',
        message: 'Conferir contribuições',
        createdById: 'admin-a',
        visibleAt: new Date('2026-12-10T12:00:00Z'),
      },
    });
    await expect(
      service.create(
        {
          type: 'INFO',
          title: 'Aviso',
          message: 'Texto',
          visibleAt: '2026-12-10T12:00:00Z',
        },
        'admin-a',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        {
          type: 'REMINDER',
          title: 'Aviso',
          message: 'Texto',
          visibleAt: '2026-12-10T12:00:00',
        },
        'admin-a',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('shows scheduled items separately from the inbox', async () => {
    db.notification.findMany.mockResolvedValue([]);
    await service.findAll(
      { page: 1, limit: 15, status: 'scheduled' },
      'admin-a',
    );
    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visibleAt: { gt: expect.any(Date) } },
      }),
    );
  });
  it('blocks forged comment notifications, internal fields, and invalid pagination', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    for (const change of [
      { type: 'COMMENT' },
      { createdById: 'other' },
      { commentId: 'forged' },
      { title: 'a'.repeat(121) },
      { message: 'a'.repeat(501) },
    ]) {
      await expect(
        pipe.transform(
          { type: 'INFO', title: 'Aviso', message: 'Mensagem', ...change },
          { type: 'body', metatype: CreateNotificationDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      pipe.transform(
        { page: '0', limit: '101' },
        { type: 'query', metatype: NotificationsQueryDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
