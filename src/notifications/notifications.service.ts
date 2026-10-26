import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateNotificationDto,
  NotificationsQueryDto,
} from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async counts(userId: string) {
    const visibleAt = { lte: new Date() };
    const [unreadCount, pendingCount] = await this.prisma.$transaction([
      this.prisma.notification.count({
        where: { visibleAt, reads: { none: { userId } } },
      }),
      this.prisma.notification.count({
        where: {
          visibleAt,
          type: 'COMMENT',
          resolution: null,
          comment: { status: 'PENDING' },
        },
      }),
    ]);
    return { unreadCount, pendingCount };
  }

  async findAll(query: NotificationsQueryDto, userId: string) {
    const where: Prisma.NotificationWhereInput = {
      visibleAt:
        query.status === 'scheduled' ? { gt: new Date() } : { lte: new Date() },
      ...(query.type && { type: query.type }),
      ...(query.status === 'unread' && { reads: { none: { userId } } }),
      ...(query.status === 'pending' && {
        type: 'COMMENT',
        resolution: null,
        comment: { status: 'PENDING' },
      }),
    };
    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ visibleAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          reads: { where: { userId }, select: { readAt: true } },
          comment: {
            select: {
              id: true,
              fullName: true,
              text: true,
              status: true,
              targetType: true,
              targetId: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
    const items = notifications.map(({ reads, ...item }) => ({
      ...item,
      readAt: reads[0]?.readAt ?? null,
    }));
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      ...(await this.counts(userId)),
    };
  }

  async create(dto: CreateNotificationDto, userId: string) {
    if (
      dto.visibleAt &&
      (dto.type !== 'REMINDER' || !/(Z|[+-]\d{2}:\d{2})$/i.test(dto.visibleAt))
    ) {
      throw new BadRequestException(
        'Use uma data com fuso horário apenas para lembretes.',
      );
    }
    return this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        message: dto.message,
        createdById: userId,
        visibleAt: dto.visibleAt ? new Date(dto.visibleAt) : new Date(),
      },
    });
  }

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        reads: { where: { userId }, select: { readAt: true } },
        comment: {
          select: {
            id: true,
            fullName: true,
            text: true,
            status: true,
            targetType: true,
            targetId: true,
          },
        },
      },
    });
    if (!notification)
      throw new NotFoundException('Notificação não encontrada.');
    const { reads, ...item } = notification;
    return { ...item, readAt: reads[0]?.readAt ?? null };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, visibleAt: { lte: new Date() } },
      select: { id: true },
    });
    if (!notification)
      throw new NotFoundException('Notificação não encontrada.');
    return this.prisma.notificationRead.upsert({
      where: { notificationId_userId: { notificationId: id, userId } },
      create: { notificationId: id, userId },
      update: {},
      select: { readAt: true },
    });
  }

  async markAllRead(userId: string) {
    // One statement avoids loading an unbounded notification history into memory.
    const count = await this.prisma.$executeRaw`
      INSERT INTO "NotificationRead" ("notificationId", "userId", "readAt")
      SELECT "id", ${userId}, NOW() FROM "Notification" WHERE "visibleAt" <= NOW()
      ON CONFLICT ("notificationId", "userId") DO NOTHING
    `;
    return { count };
  }
}
