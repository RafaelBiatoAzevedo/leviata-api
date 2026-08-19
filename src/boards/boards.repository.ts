import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { BoardQueryDto } from './DTOs/board-query.dto';

@Injectable()
export class BoardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    candidate: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
    advisor: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
    members: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
  };

  findById(id: string) {
    return this.prisma.board.findFirst({
      where: {
        id,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.board.findUnique({
      where: {
        slug,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.board.count({
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

  async findAll(query: BoardQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      candidateId,
      advisorId,
      dateFrom,
      dateTo,
    } = query;

    return this.prisma.board.findMany({
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

        ...(candidateId && {
          candidateId,
        }),

        ...(advisorId && {
          advisorId,
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

      include: this.include,

      orderBy: {
        date: 'asc',
      },

      skip: (page - 1) * limit,
      take: limit,
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.board.update({
      where: {
        id,
      },

      data: {},
    });
  }

  update(id: string, data: Prisma.BoardUpdateInput) {
    return this.prisma.board.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.BoardCreateInput) {
    return this.prisma.board.create({
      data,
      include: this.include,
    });
  }
}
