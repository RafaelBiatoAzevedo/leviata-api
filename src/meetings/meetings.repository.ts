import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { MeetingsQueryDto } from './DTOs/meeting-query.dto';

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    speakers: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },

    images: {},
  };

  findById(id: string) {
    return this.prisma.meeting.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.meeting.findUnique({
      where: {
        slug,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.meeting.count({
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

  async findAll(query: MeetingsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      speakerId,
      dateFrom,
      dateTo,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    return this.prisma.meeting.findMany({
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
          ],
        }),

        ...(type && {
          type,
        }),

        ...(speakerId && {
          speakers: {
            some: {
              id: speakerId,
            },
          },
        }),

        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom && {
                  gte: new Date(`${dateFrom}T00:00:00.000Z`),
                }),
                ...(dateTo && {
                  lte: new Date(`${dateTo}T23:59:59.999Z`),
                }),
              },
            }
          : {}),
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
    return this.prisma.meeting.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.MeetingUpdateInput) {
    return this.prisma.meeting.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.MeetingCreateInput) {
    return this.prisma.meeting.create({
      data,
      include: this.include,
    });
  }
}
