import { listPage } from '../common/utils/list-page';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { VideosQueryDto } from './DTOs/video-query.dto';

@Injectable()
export class VideosRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    people: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
    thematicMain: true,
    thematicVideos: true,
  };

  findById(id: string) {
    return this.prisma.video.findFirst({
      where: {
        id,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.video.findUnique({
      where: {
        slug,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.video.count({
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

  findAll(query: VideosQueryDto) {
    return this.prisma.video.findMany(this.listArgs(query));
  }

  findPage(query: VideosQueryDto) {
    const args = this.listArgs(query);
    return listPage(
      query,
      this.prisma.video.findMany({
        ...args,
        orderBy: [
          ...(Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]),
          { id: 'asc' },
        ],
      }),
      this.prisma.video.count({ where: args.where }),
    );
  }

  private listArgs(query: VideosQueryDto) {
    const { page = 1, limit = 10, search, personId } = query;

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

        ...(personId && {
          people: {
            some: {
              id: personId,
            },
          },
        }),
      },

      include: this.include,

      orderBy: {
        createdAt: 'desc',
      },

      skip: (page - 1) * limit,

      take: limit,
    } satisfies Prisma.VideoFindManyArgs;
  }

  remove(id: string, userId: string) {
    return this.prisma.video.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.VideoUpdateInput) {
    return this.prisma.video.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.VideoCreateInput) {
    return this.prisma.video.create({
      data,
      include: this.include,
    });
  }
}
