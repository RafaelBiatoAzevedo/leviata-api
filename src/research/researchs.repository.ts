import { listPage } from '../common/utils/list-page';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ResearchQueryDto } from './DTOs/research-query.dto';

@Injectable()
export class ResearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    people: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },

    images: {
      orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    },

    supports: {
      orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    },
  };

  findById(id: string) {
    return this.prisma.search.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.search.findUnique({
      where: {
        slug,
        deletedAt: null,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.search.count({
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

  findAll(query: ResearchQueryDto) {
    return this.prisma.search.findMany(this.listArgs(query));
  }

  findPage(query: ResearchQueryDto) {
    const args = this.listArgs(query);
    return listPage(
      query,
      this.prisma.search.findMany({
        ...args,
        orderBy: [
          ...(Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]),
          { id: 'asc' },
        ],
      }),
      this.prisma.search.count({ where: args.where }),
    );
  }

  private listArgs(query: ResearchQueryDto) {
    const { page = 1, limit = 10, search } = query;

    return {
      where: {
        deletedAt: null,

        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            {
              slug: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              content: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      },

      include: this.include,

      orderBy: {
        slug: 'asc',
      },

      skip: (page - 1) * limit,
      take: limit,
    } satisfies Prisma.SearchFindManyArgs;
  }

  remove(id: string, userId: string) {
    return this.prisma.search.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.SearchUpdateInput) {
    return this.prisma.search.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.SearchCreateInput) {
    return this.prisma.search.create({
      data,
      include: this.include,
    });
  }
}
