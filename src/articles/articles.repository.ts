import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ArticlesQueryDto } from './dto/article-query.dto';

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

  async findAll(query: ArticlesQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      authorId,
      year,
      sortBy = 'title',
      sortOrder = 'asc',
    } = query;

    return this.prisma.article.findMany({
      where: {
        deletedAt: null,

        ...(search && {
          OR: [
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
    });
  }

  remove(id: string, articleId: string) {
    return this.prisma.article.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: articleId,
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
