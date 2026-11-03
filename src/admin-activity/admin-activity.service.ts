import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailConfig } from '../mail/mail.config';
import { MailService } from '../mail/mail.service';
import { mailFailure } from '../mail/mail-errors';
import {
  activityDetails,
  activityMessage,
  type ActivityRequest,
} from './admin-activity.data';

@Injectable()
export class AdminActivityService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AdminActivityService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private lastRecovery = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: MailConfig,
    private readonly mail: MailService,
  ) {}

  begin(request: ActivityRequest) {
    return this.prisma.adminActivity.create({
      data: {
        actorId: request.user.id,
        actorEmail: request.user.email,
        actorName:
          [request.user.firstName, request.user.lastName]
            .filter(Boolean)
            .join(' ') || null,
        method: request.method,
        path: (request.originalUrl ?? request.url).split('?')[0],
        details: activityDetails(request),
      },
    });
  }

  async complete(id: string, request: ActivityRequest, result: unknown) {
    try {
      await this.prisma.adminActivity.update({
        where: { id },
        data: {
          status: 'PENDING',
          outcome: 'SUCCEEDED',
          completedAt: new Date(),
          details: activityDetails(request, result),
        },
      });
    } catch {
      // The reserved record remains recoverable; never tell the editor to repeat an already saved mutation.
      this.logger.error(
        `Ação ${id} salva, mas a conclusão da auditoria não foi persistida. O registro reservado exige conferência.`,
      );
    }
  }

  async failed(id: string) {
    try {
      await this.prisma.adminActivity.update({
        where: { id },
        data: {
          status: 'ACTION_FAILED',
          outcome: 'FAILED',
          completedAt: new Date(),
        },
      });
    } catch {
      this.logger.error(`Não foi possível registrar a falha da ação ${id}.`);
    }
  }

  onApplicationBootstrap() {
    const settings = this.config.settings();
    if (!settings.enabled || !settings.workerEnabled || settings.missing.length)
      return;
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = this.processNext()
        .then(() => undefined)
        .catch(() =>
          this.logger.error(
            'Falha na fila de auditoria administrativa; registros persistidos preservados.',
          ),
        )
        .finally(() => {
          this.running = undefined;
        });
    }, 1000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }

  async processNext() {
    const settings = this.config.settings();
    if (!settings.enabled || settings.missing.length) return false;
    const now = new Date();
    if (Date.now() - this.lastRecovery > 60000) {
      await this.prisma.adminActivity.updateMany({
        where: {
          status: 'SENDING',
          lastAttemptAt: { lt: new Date(Date.now() - 600000) },
        },
        data: { status: 'UNKNOWN', errorCode: 'INTERRUPTED_SEND' },
      });
      await this.prisma.adminActivity.updateMany({
        where: {
          status: 'RECORDING',
          createdAt: { lt: new Date(Date.now() - 600000) },
        },
        data: { status: 'PENDING', outcome: 'UNCONFIRMED' },
      });
      this.lastRecovery = Date.now();
    }
    const activity = await this.prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<
        { locked: boolean }[]
      >`SELECT pg_try_advisory_xact_lock(724116, 20261102) AS locked`;
      if (!lock[0]?.locked) return null;
      const recent = await tx.adminActivity.findFirst({
        where: {
          lastAttemptAt: { gte: new Date(now.getTime() - settings.intervalMs) },
        },
        select: { id: true },
      });
      if (recent) return null;
      const used = await tx.adminActivity.count({
        where: {
          lastAttemptAt: { gte: new Date(now.getTime() - 86400000) },
          status: { in: ['SENDING', 'SENT', 'UNKNOWN'] },
        },
      });
      if (used >= settings.dailyLimit) return null;
      const pending = await tx.adminActivity.findFirst({
        where: { status: 'PENDING', nextAttemptAt: { lte: now } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      if (!pending) return null;
      const claimed = await tx.adminActivity.updateMany({
        where: { id: pending.id, status: 'PENDING' },
        data: {
          status: 'SENDING',
          attempts: { increment: 1 },
          lastAttemptAt: now,
        },
      });
      return claimed.count ? pending : null;
    });
    if (!activity) return false;
    try {
      await this.mail.send({
        to: settings.from,
        messageId: `<admin-activity-${activity.id}@${settings.from.split('@')[1]}>`,
        ...activityMessage(activity),
      });
    } catch (error) {
      await this.prisma.adminActivity.update({
        where: { id: activity.id },
        data: mailFailure(error, activity.attempts + 1, settings.maxAttempts),
      });
      return true;
    }
    try {
      await this.prisma.adminActivity.update({
        where: { id: activity.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          errorCode: null,
        },
      });
    } catch {
      await this.prisma.adminActivity.updateMany({
        where: { id: activity.id, status: 'SENDING' },
        data: {
          status: 'UNKNOWN',
          errorCode: 'PERSISTENCE_AFTER_SEND',
        },
      });
    }
    return true;
  }

  status() {
    return this.prisma.adminActivity.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
  }

  retryFailed() {
    return this.prisma.adminActivity.updateMany({
      where: { status: 'FAILED' },
      data: {
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: new Date(),
        errorCode: null,
      },
    });
  }
}
