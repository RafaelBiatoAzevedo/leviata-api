import { listPage } from '../common/utils/list-page';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NewsQueryDto } from './DTOs/news-query.dto';

@Injectable()
export class NewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.news.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.news.findUnique({
      where: {
        slug,
      },
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.news.count({
      where: {
        slug,
        deletedAt: null,
        ...(ignoreId && {
          NOT: {
            id: ignoreId,
          },
        }),
      },
    });

    return count > 0;
  }

  findAll(query: NewsQueryDto) {
    return this.prisma.news.findMany(this.listArgs(query));
  }

  findPage(query: NewsQueryDto) {
    const args = this.listArgs(query);
    return listPage(
      query,
      this.prisma.news.findMany({
        ...args,
        orderBy: [
          ...(Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]),
          { id: 'asc' },
        ],
      }),
      this.prisma.news.count({ where: args.where }),
    );
  }

  private listArgs(query: NewsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      isInternal,
      dateFrom,
      dateTo,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    return {
      where: {
        deletedAt: null,

        ...(search && {
          OR: [
            { slug: { contains: search, mode: 'insensitive' } },
            {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),

        ...(category && {
          category,
        }),

        ...(isInternal !== undefined && {
          isInternal,
        }),

        ...((dateFrom || dateTo) && {
          date: {
            ...(dateFrom && {
              gte: new Date(dateFrom),
            }),
            ...(dateTo && {
              lte: new Date(dateTo),
            }),
          },
        }),
      },

      orderBy: {
        [sortBy]: sortOrder,
      },

      skip: (page - 1) * limit,
      take: limit,
    } satisfies Prisma.NewsFindManyArgs;
  }

  remove(id: string, userId: string) {
    return this.prisma.news.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.NewsUpdateInput) {
    return this.prisma.news.update({
      where: {
        id,
      },

      data,
    });
  }

  create(data: Prisma.NewsCreateInput) {
    return this.prisma.news.create({
      data,
    });
  }
}
