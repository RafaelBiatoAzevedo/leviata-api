import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NewsletterQueryDto } from './DTOs/newsletter-query.dto';

@Injectable()
export class NewsletterRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.newsletter.findFirst({ where: { id, deletedAt: null } });
  }

  findBySlug(slug: string) {
    return this.prisma.newsletter.findFirst({
      where: { slug, deletedAt: null },
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

  findAll({
    page = 1,
    limit = 10,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }: NewsletterQueryDto) {
    return this.prisma.newsletter.findMany({
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
    });
  }

  create(data: Prisma.NewsletterCreateInput) {
    return this.prisma.newsletter.create({ data });
  }

  update(id: string, data: Prisma.NewsletterUpdateInput) {
    return this.prisma.newsletter.update({ where: { id }, data });
  }

  remove(id: string, userId: string) {
    return this.prisma.newsletter.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId },
    });
  }
}
