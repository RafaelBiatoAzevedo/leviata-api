import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { JuriesQueryDto } from './DTOs/jury-query.dto';

@Injectable()
export class JuriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
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

  async findAll(query: JuriesQueryDto) {
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

    return this.prisma.jury.findMany({
      where: {
        deletedAt: null,

        ...(search && {
          title: {
            contains: search,
            mode: 'insensitive',
          },
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
    });
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
