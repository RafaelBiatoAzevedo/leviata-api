import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PresentedWorksQueryDto } from './DTOs/presented-work-query.dto';

@Injectable()
export class PresentedWorksRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    authors: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
    meeting: true,
    images: true,
  };

  findById(id: string) {
    return this.prisma.presentedWork.findFirst({
      where: {
        id,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.presentedWork.findUnique({
      where: {
        slug,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.presentedWork.count({
      where: {
        slug,
        ...(ignoreId && {
          NOT: {
            id: ignoreId,
          },
        }),
      },
    });

    return count > 0;
  }

  async findAll(query: PresentedWorksQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      dateFrom,
      dateTo,
      meetingId,
      authorId,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    return this.prisma.presentedWork.findMany({
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

        ...(meetingId && {
          meetingId,
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

  remove(id: string, userId: string) {
    return this.prisma.presentedWork.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.PresentedWorkUncheckedUpdateInput) {
    return this.prisma.presentedWork.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.PresentedWorkUncheckedCreateInput) {
    return this.prisma.presentedWork.create({
      data,
      include: this.include,
    });
  }
}
