import { listPage } from '../common/utils/list-page';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NewsletterQueryDto } from './DTOs/newsletter-query.dto';
import { SubscribeNewsletterDto } from './DTOs/subscribe-newsletter.dto';

@Injectable()
export class NewsletterRepository {
  constructor(private readonly prisma: PrismaService) {}

  subscribe({ email, name, cellphone }: SubscribeNewsletterDto) {
    const details = {
      ...(name && { name }),
      ...(cellphone && { cellphone }),
    };
    return this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, ...details },
      update: {
        ...details,
        isActive: true,
        allowEmail: true,
        unsubscribedAt: null,
        deletedAt: null,
        deletedById: null,
      },
      select: { id: true },
    });
  }

  findById(id: string) {
    return this.prisma.newsletter.findFirst({
      where: { id, deletedAt: null },
      omit: { pdfContent: true },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.newsletter.findFirst({
      where: { slug, deletedAt: null },
      omit: { pdfContent: true },
    });
  }

  async existsSlug(slug: string, ignoreId?: string) {
    return (
      (await this.prisma.newsletter.count({
        where: {
          slug,
          deletedAt: null,
          ...(ignoreId && { NOT: { id: ignoreId } }),
        },
      })) > 0
    );
  }

  findAll(query: NewsletterQueryDto) {
    return this.prisma.newsletter.findMany(this.listArgs(query));
  }

  findPage(query: NewsletterQueryDto) {
    const args = this.listArgs(query);
    return listPage(
      query,
      this.prisma.newsletter.findMany({
        ...args,
        orderBy: [
          ...(Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]),
          { id: 'asc' },
        ],
      }),
      this.prisma.newsletter.count({ where: args.where }),
    );
  }

  private listArgs({
    page = 1,
    limit = 10,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }: NewsletterQueryDto) {
    return {
      omit: { pdfContent: true },
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { subject: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    } satisfies Prisma.NewsletterFindManyArgs;
  }

  create(data: Prisma.NewsletterCreateInput) {
    return this.prisma.newsletter.create({ data, omit: { pdfContent: true } });
  }

  update(id: string, data: Prisma.NewsletterUpdateInput) {
    return this.prisma.newsletter.update({
      where: { id },
      data,
      omit: { pdfContent: true },
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.newsletter.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId },
    });
  }
}
