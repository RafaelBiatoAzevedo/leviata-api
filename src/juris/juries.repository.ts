import { listPage } from '../common/utils/list-page';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { JuriesQueryDto } from './DTOs/jury-query.dto';

@Injectable()
export class JuriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    images: {
      orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    },
    judges: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },

    jurors: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },

    prosecutors: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },

    defenders: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },

    bailiffs: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
  };

  findById(id: string) {
    return this.prisma.jury.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.jury.findUnique({
      where: {
        slug,
        deletedAt: null,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.jury.count({
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

  findAll(query: JuriesQueryDto) {
    return this.prisma.jury.findMany(this.listArgs(query));
  }

  findPage(query: JuriesQueryDto) {
    const args = this.listArgs(query);
    return listPage(
      query,
      this.prisma.jury.findMany({
        ...args,
        orderBy: [
          ...(Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]),
          { id: 'asc' },
        ],
      }),
      this.prisma.jury.count({ where: args.where }),
    );
  }

  private listArgs(query: JuriesQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      dateFrom,
      dateTo,
      judgeId,
      jurorId,
      prosecutorId,
      defenderId,
      bailiffId,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    return {
      where: {
        deletedAt: null,

        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }),

        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom && {
                  gte: new Date(dateFrom),
                }),
                ...(dateTo && {
                  lte: new Date(dateTo),
                }),
              },
            }
          : {}),

        ...(judgeId && {
          judges: {
            some: {
              id: judgeId,
            },
          },
        }),

        ...(jurorId && {
          jurors: {
            some: {
              id: jurorId,
            },
          },
        }),

        ...(prosecutorId && {
          prosecutors: {
            some: {
              id: prosecutorId,
            },
          },
        }),

        ...(defenderId && {
          defenders: {
            some: {
              id: defenderId,
            },
          },
        }),

        ...(bailiffId && {
          bailiffs: {
            some: {
              id: bailiffId,
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
    } satisfies Prisma.JuryFindManyArgs;
  }

  remove(id: string, userId: string) {
    return this.prisma.jury.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.JuryUpdateInput) {
    return this.prisma.jury.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.JuryCreateInput) {
    return this.prisma.jury.create({
      data,
      include: this.include,
    });
  }
}
