import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailConfig } from './mail.config';
import { MailService } from './mail.service';
import { MailUnsubscribeService } from './mail-unsubscribe.service';
import { newsletterMessage } from './mail.template';
import { MailDeliveriesQueryDto } from './mail.dto';

@Injectable()
export class MailNewslettersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: MailConfig,
    private readonly mail: MailService,
    private readonly unsubscribe: MailUnsubscribeService,
  ) {}

  private async newsletter(id: string) {
    const newsletter = await this.prisma.newsletter.findFirst({
      where: { id, deletedAt: null },
    });
    if (!newsletter) throw new NotFoundException('Newsletter não encontrada.');
    return newsletter;
  }

  async test(id: string, to: string) {
    const settings = this.config.requireReady();
    const newsletter = await this.newsletter(id);
    const message = newsletterMessage({
      ...newsletter,
      portalUrl: `${settings.portalUrl}/noticias/newsletter`,
    });
    try {
      const result = await this.mail.send({
        to,
        subject: `[TESTE] ${newsletter.subject}`,
        ...message,
      });
      return {
        message:
          'E-mail de teste aceito pelo SMTP. Confira a caixa de entrada e o spam.',
        messageId: result.messageId,
      };
    } catch {
      throw new ServiceUnavailableException(
        'O provedor não confirmou o envio de teste. Verifique a conexão SMTP antes de tentar novamente.',
      );
    }
  }

  async enqueue(id: string, userId: string) {
    this.config.requireReady();
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const newsletter = await tx.newsletter.findFirst({
            where: { id, deletedAt: null },
          });
          if (!newsletter)
            throw new NotFoundException('Newsletter não encontrada.');
          const existing = await tx.newsletterMailCampaign.findUnique({
            where: { newsletterId: id },
          });
          if (existing) return;
          if (newsletter.sentAt)
            throw new ConflictException(
              'Esta newsletter já está marcada como enviada.',
            );
          if (!newsletter.publishedAt || newsletter.publishedAt > new Date())
            throw new BadRequestException(
              'Publique a newsletter antes de iniciar o envio aos inscritos.',
            );
          const subscribers = await tx.newsletterSubscriber.findMany({
            where: {
              isActive: true,
              allowEmail: true,
              deletedAt: null,
              deliveries: { none: { newsletterId: id, errorMessage: null } },
            },
            select: { id: true, email: true },
            orderBy: { id: 'asc' },
          });
          const eligible = subscribers.filter((subscriber) =>
            isEmail(subscriber.email),
          );
          if (!eligible.length)
            throw new BadRequestException(
              'Nenhum inscrito elegível para receber esta newsletter.',
            );
          const campaign = await tx.newsletterMailCampaign.create({
            data: {
              newsletterId: id,
              title: newsletter.title,
              subject: newsletter.subject,
              htmlContent: newsletter.htmlContent,
              slug: newsletter.slug,
              createdById: userId,
            },
          });
          for (let offset = 0; offset < eligible.length; offset += 500)
            await tx.newsletterMailRecipient.createMany({
              data: eligible.slice(offset, offset + 500).map((subscriber) => ({
                campaignId: campaign.id,
                subscriberId: subscriber.id,
                email: subscriber.email,
              })),
            });
        },
        { isolationLevel: 'Serializable', timeout: 30000 },
      );
    } catch (error) {
      // A concurrent identical request reuses the campaign instead of sending twice.
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        !['P2002', 'P2034'].includes(error.code)
      )
        throw error;
      if (
        !(await this.prisma.newsletterMailCampaign.findUnique({
          where: { newsletterId: id },
        }))
      )
        throw error;
    }
    return this.status(id);
  }

  async status(id: string) {
    await this.newsletter(id);
    const campaign = await this.prisma.newsletterMailCampaign.findUnique({
      where: { newsletterId: id },
      select: {
        id: true,
        subject: true,
        createdAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    });
    if (!campaign) return { status: 'NOT_QUEUED', campaign: null };
    const groups = await this.prisma.newsletterMailRecipient.groupBy({
      by: ['status'],
      where: { campaignId: campaign.id },
      _count: true,
    });
    const counts = Object.fromEntries(
      groups.map((group) => [group.status, group._count]),
    );
    const pending = (counts.PENDING || 0) + (counts.SENDING || 0);
    const problems = (counts.FAILED || 0) + (counts.UNKNOWN || 0);
    return {
      status: campaign.cancelledAt
        ? 'CANCELLED'
        : pending
          ? 'PROCESSING'
          : problems
            ? 'NEEDS_REVIEW'
            : 'COMPLETED',
      campaign,
      counts: {
        pending: counts.PENDING || 0,
        sending: counts.SENDING || 0,
        sent: counts.SENT || 0,
        failed: counts.FAILED || 0,
        skipped: counts.SKIPPED || 0,
        unknown: counts.UNKNOWN || 0,
      },
      total: groups.reduce((sum, group) => sum + group._count, 0),
    };
  }

  async audience(id: string) {
    await this.newsletter(id);
    const [registered, subscribers] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.count({ where: { deletedAt: null } }),
      this.prisma.newsletterSubscriber.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          allowEmail: true,
          deliveries: { none: { newsletterId: id, errorMessage: null } },
        },
        select: { email: true },
      }),
    ]);
    const eligible = subscribers.filter((subscriber) =>
      isEmail(subscriber.email),
    ).length;
    return { registered, eligible, excluded: registered - eligible };
  }

  async deliveryRecords(id: string, query: MailDeliveriesQueryDto) {
    await this.newsletter(id);
    const where = { newsletterId: id, errorMessage: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsletterDelivery.findMany({
        where,
        select: {
          id: true,
          subscriberId: true,
          sentAt: true,
          subscriber: { select: { name: true, email: true } },
        },
        orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.newsletterDelivery.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async deliveries(id: string, query: MailDeliveriesQueryDto) {
    await this.newsletter(id);
    const where = { campaign: { newsletterId: id } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsletterMailRecipient.findMany({
        where,
        select: {
          id: true,
          email: true,
          status: true,
          attempts: true,
          sentAt: true,
          errorCode: true,
          messageId: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.newsletterMailRecipient.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async retry(id: string) {
    this.config.requireReady();
    await this.newsletter(id);
    await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.newsletterMailCampaign.findUnique({
        where: { newsletterId: id },
      });
      if (!campaign)
        throw new NotFoundException(
          'Nenhum envio iniciado para esta newsletter.',
        );
      if (campaign.cancelledAt)
        throw new ConflictException('O envio foi cancelado.');
      // UNKNOWN deliveries need provider reconciliation; retrying them could duplicate messages.
      await tx.newsletterMailRecipient.updateMany({
        where: { campaignId: campaign.id, status: 'FAILED' },
        data: {
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date(),
          errorCode: null,
        },
      });
      await tx.newsletterMailCampaign.update({
        where: { id: campaign.id },
        data: { completedAt: null },
      });
    });
    return this.status(id);
  }

  async cancel(id: string) {
    await this.newsletter(id);
    await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.newsletterMailCampaign.findUnique({
        where: { newsletterId: id },
      });
      if (!campaign)
        throw new NotFoundException(
          'Nenhum envio iniciado para esta newsletter.',
        );
      await tx.newsletterMailCampaign.update({
        where: { id: campaign.id },
        data: { cancelledAt: new Date() },
      });
      await tx.newsletterMailRecipient.updateMany({
        where: { campaignId: campaign.id, status: 'PENDING' },
        data: { status: 'SKIPPED', errorCode: 'CAMPAIGN_CANCELLED' },
      });
    });
    return this.status(id);
  }

  message(
    campaign: { title: string; slug: string; htmlContent: string },
    subscriber: { id: string; email: string },
  ) {
    const settings = this.config.requireReady();
    const unsubscribeUrl = this.unsubscribe.link(subscriber);
    return {
      ...newsletterMessage({
        ...campaign,
        portalUrl: `${settings.portalUrl}/noticias/newsletter`,
        unsubscribeUrl,
      }),
      unsubscribeUrl,
    };
  }
}
