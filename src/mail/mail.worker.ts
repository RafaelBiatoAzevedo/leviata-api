import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailConfig } from './mail.config';
import { MailService } from './mail.service';
import { MailNewslettersService } from './mail-newsletters.service';
import { mailFailure } from './mail-errors';

@Injectable()
export class MailWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MailWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private lastRecovery = 0;
  private pausedUntil = 0;
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: MailConfig,
    private readonly mail: MailService,
    private readonly newsletters: MailNewslettersService,
  ) {}

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
            'Falha no processamento da fila de newsletters. Os registros persistidos serão preservados.',
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

  state() {
    return {
      pausedUntil:
        this.pausedUntil > Date.now()
          ? new Date(this.pausedUntil).toISOString()
          : null,
    };
  }

  resume() {
    this.pausedUntil = 0;
  }

  private async finish(campaignId: string) {
    await this.prisma.$transaction(async (tx) => {
      const remaining = await tx.newsletterMailRecipient.count({
        where: {
          campaignId,
          status: { in: ['PENDING', 'SENDING', 'FAILED', 'UNKNOWN'] },
        },
      });
      if (remaining) return;
      const campaign = await tx.newsletterMailCampaign.findUnique({
        where: { id: campaignId },
      });
      if (!campaign || campaign.cancelledAt || campaign.completedAt) return;
      const sent = await tx.newsletterMailRecipient.count({
        where: { campaignId, status: 'SENT' },
      });
      await tx.newsletterMailCampaign.update({
        where: { id: campaignId },
        data: { completedAt: new Date() },
      });
      if (sent)
        await tx.newsletter.update({
          where: { id: campaign.newsletterId },
          data: { sentAt: new Date() },
        });
    });
  }

  async processNext() {
    const settings = this.config.requireReady();
    if (this.pausedUntil > Date.now()) return false;
    const now = new Date();
    if (Date.now() - this.lastRecovery > 60000) {
      await this.prisma.newsletterMailRecipient.updateMany({
        where: {
          status: 'SENDING',
          lastAttemptAt: { lt: new Date(Date.now() - 600000) },
        },
        data: { status: 'UNKNOWN', errorCode: 'INTERRUPTED_SEND' },
      });
      this.lastRecovery = Date.now();
    }

    const claimed = await this.prisma.$transaction(async (tx) => {
      // Serialize only the short claim transaction across all API instances.
      // SMTP calls are made after commit, without holding a database connection.
      const lock = await tx.$queryRaw<
        { locked: boolean }[]
      >`SELECT pg_try_advisory_xact_lock(724115, 20261025) AS locked`;
      if (!lock[0]?.locked) return null;
      const recipient = await tx.newsletterMailRecipient.findFirst({
        where: {
          status: 'PENDING',
          nextAttemptAt: { lte: now },
          campaign: {
            cancelledAt: null,
            newsletter: { deletedAt: null, publishedAt: { lte: now } },
          },
        },
        include: { subscriber: true, campaign: { omit: { pdfContent: true } } },
        orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
      });
      if (!recipient) return null;
      const subscriber = recipient.subscriber;
      if (
        !subscriber.isActive ||
        !subscriber.allowEmail ||
        subscriber.deletedAt ||
        subscriber.email !== recipient.email
      ) {
        await tx.newsletterMailRecipient.update({
          where: { id: recipient.id },
          data: { status: 'SKIPPED', errorCode: 'SUBSCRIPTION_INELIGIBLE' },
        });
        return { recipient, skipped: true };
      }
      const recent = await tx.newsletterMailRecipient.findFirst({
        where: {
          lastAttemptAt: { gte: new Date(now.getTime() - settings.intervalMs) },
        },
        select: { id: true },
      });
      if (recent) return null;
      const used = await tx.newsletterMailRecipient.count({
        where: {
          lastAttemptAt: { gte: new Date(now.getTime() - 86400000) },
          status: { in: ['SENT', 'SENDING', 'UNKNOWN'] },
        },
      });
      if (used >= settings.dailyLimit) return null;
      const updated = await tx.newsletterMailRecipient.updateMany({
        where: { id: recipient.id, status: 'PENDING' },
        data: {
          status: 'SENDING',
          attempts: { increment: 1 },
          lastAttemptAt: now,
          messageId: `<newsletter-${recipient.id}@${settings.from.split('@')[1]}>`,
        },
      });
      return updated.count ? { recipient, skipped: false } : null;
    });
    if (!claimed) return false;
    const { recipient } = claimed;
    if (claimed.skipped) {
      await this.finish(recipient.campaignId);
      return true;
    }

    // Recheck consent and cancellation immediately before starting SMTP.
    const current = await this.prisma.newsletterMailRecipient.findUnique({
      where: { id: recipient.id },
      include: {
        subscriber: true,
        campaign: {
          include: {
            newsletter: { select: { deletedAt: true, publishedAt: true } },
          },
        },
      },
    });
    if (!current || current.status !== 'SENDING') return false;
    if (
      !current.subscriber.allowEmail ||
      !current.subscriber.isActive ||
      current.subscriber.deletedAt ||
      current.subscriber.email !== current.email ||
      current.campaign.cancelledAt ||
      current.campaign.newsletter.deletedAt ||
      !current.campaign.newsletter.publishedAt ||
      current.campaign.newsletter.publishedAt > new Date()
    ) {
      await this.prisma.newsletterMailRecipient.update({
        where: { id: current.id },
        data: {
          status: 'SKIPPED',
          errorCode: 'SUBSCRIPTION_OR_CAMPAIGN_CHANGED',
        },
      });
      await this.finish(current.campaignId);
      return true;
    }

    let messageId: string;
    try {
      const result = await this.mail.send({
        to: current.email,
        subject: current.campaign.subject,
        messageId: `<newsletter-${current.id}@${settings.from.split('@')[1]}>`,
        ...(await this.newsletters.message(current.campaign, {
          id: current.subscriberId,
          email: current.email,
        })),
      });
      messageId = result.messageId;
    } catch (error) {
      const failure = mailFailure(
        error,
        current.attempts,
        settings.maxAttempts,
      );
      if (/^(EAUTH|EOAUTH2)(_|$)/.test(failure.errorCode)) {
        this.pausedUntil = Date.now() + 3600000;
        this.logger.warn(
          'SMTP recusou a autenticação. Fila pausada por uma hora; valide as credenciais antes de retomar.',
        );
      }
      await this.prisma.newsletterMailRecipient.update({
        where: { id: current.id },
        data: failure,
      });
      return true;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.newsletterMailRecipient.updateMany({
          where: { id: current.id, status: 'SENDING' },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            messageId,
            errorCode: null,
          },
        });
        if (updated.count)
          await tx.newsletterDelivery.create({
            data: {
              newsletterId: current.campaign.newsletterId,
              subscriberId: current.subscriberId,
              sentAt: new Date(),
            },
          });
      });
    } catch {
      this.logger.error(
        `SMTP aceitou a entrega ${current.id}, mas a persistência falhou. Conferência manual necessária.`,
      );
      await this.prisma.newsletterMailRecipient.updateMany({
        where: { id: current.id, status: 'SENDING' },
        data: { status: 'UNKNOWN', errorCode: 'PERSISTENCE_AFTER_SEND' },
      });
    }
    await this.finish(current.campaignId);
    return true;
  }
}
