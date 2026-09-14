import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ResearchInstrumentsQueryDto } from './DTOs/researchInstrument-query.dto';

@Injectable()
export class ResearchInstrumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    people: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
  };

  findById(id: string) {
    return this.prisma.researchInstrument.findFirst({
      where: {
        id,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.researchInstrument.findUnique({
      where: {
        slug,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.researchInstrument.count({
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

  async findAll(query: ResearchInstrumentsQueryDto) {
    const { page = 1, limit = 10, search, type, startYear, endYear } = query;

    return this.prisma.researchInstrument.findMany({
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

        ...(type && {
          type,
        }),

        ...((startYear !== undefined || endYear !== undefined) && {
          AND: [
            ...(startYear !== undefined
              ? [
                  {
                    OR: [
                      {
                        startYear: {
                          gte: startYear,
                        },
                      },
                      {
                        endYear: {
                          gte: startYear,
                        },
                      },
                    ],
                  },
                ]
              : []),

            ...(endYear !== undefined
              ? [
                  {
                    OR: [
                      {
                        startYear: {
                          lte: endYear,
                        },
                      },
                      {
                        endYear: {
                          lte: endYear,
                        },
                      },
                    ],
                  },
                ]
              : []),
          ],
        }),
      },

      include: this.include,

      orderBy: {
        startYear: 'asc',
      },

      skip: (page - 1) * limit,
      take: limit,
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.researchInstrument.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.ResearchInstrumentUncheckedUpdateInput) {
    return this.prisma.researchInstrument.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.ResearchInstrumentUncheckedCreateInput) {
    return this.prisma.researchInstrument.create({
      data,
      include: this.include,
    });
  }
}
