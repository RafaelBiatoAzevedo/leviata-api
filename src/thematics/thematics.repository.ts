import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ThematicsQueryDto } from './DTOs/thematic-query.dto';

@Injectable()
export class ThematicsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    mainVideo: true,
    coordinator: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
    additionalVideos: {
      include: {
        video: true,
      },
    },
  };

  findById(id: string) {
    return this.prisma.thematic.findFirst({
      where: {
        id,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.thematic.findUnique({
      where: {
        slug,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.thematic.count({
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

  async findAll(query: ThematicsQueryDto) {
    const { page = 1, limit = 10, search, coordinatorId, mainVideoId } = query;

    return this.prisma.thematic.findMany({
      where: {
        ...(search && {
          OR: [
            {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              slug: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),

        ...(coordinatorId && {
          coordinatorId,
        }),

        ...(mainVideoId && {
          mainVideoId,
        }),
      },

      include: this.include,

      skip: (page - 1) * limit,
      take: limit,
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.thematic.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.ThematicUpdateInput) {
    return this.prisma.thematic.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.ThematicCreateInput) {
    return this.prisma.thematic.create({
      data,
      include: this.include,
    });
  }
}
