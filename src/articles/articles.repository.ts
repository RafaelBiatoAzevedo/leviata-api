import { listPage } from '../common/utils/list-page';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ArticlesQueryDto } from './DTOs/article-query.dto';

@Injectable()
export class ArticlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    authors: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
  };

  findById(id: string) {
    return this.prisma.article.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.article.findUnique({
      where: {
        slug,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.article.count({
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

  findAll(query: ArticlesQueryDto) {
    return this.prisma.article.findMany(this.listArgs(query));
  }

  findPage(query: ArticlesQueryDto) {
    const args = this.listArgs(query);
    return listPage(
      query,
      this.prisma.article.findMany({
        ...args,
        orderBy: [
          ...(Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]),
          { id: 'asc' },
        ],
      }),
      this.prisma.article.count({ where: args.where }),
    );
  }

  private listArgs(query: ArticlesQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      authorId,
      year,
      sortBy = 'title',
      sortOrder = 'asc',
    } = query;

    return {
      where: {
        deletedAt: null,
        ...(type && { type }),

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
              journal: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              doi: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              summary: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),

        ...(year && {
          year,
        }),

        ...(authorId && {
          authors: {
            some: {
              id: authorId,
            },
          },
        }),
      },

      include: this.include,

      orderBy: {
        [sortBy]: sortOrder,
      },

      skip: (page - 1) * limit,
      take: limit,
    } satisfies Prisma.ArticleFindManyArgs;
  }

  remove(id: string, userId: string) {
    return this.prisma.article.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.ArticleUpdateInput) {
    return this.prisma.article.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.ArticleCreateInput) {
    return this.prisma.article.create({
      data,
      include: this.include,
    });
  }
}
