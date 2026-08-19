import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PeopleQueryDto } from './DTOs/people-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PeopleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    nationality: true,
    academicTitle: true,
    institution: true,
  };

  findById(id: string) {
    return this.prisma.person.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.person.findUnique({
      where: {
        slug,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.person.count({
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

  findAll(query: PeopleQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      institutionId,
      academicTitleId,
      nationalityId,
      isActive,
      sortBy = 'displayOrder',
      sortOrder = 'asc',
    } = query;

    return this.prisma.person.findMany({
      where: {
        deletedAt: null,

        ...(search && {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }),

        ...(category && { category }),

        ...(institutionId && { institutionId }),

        ...(academicTitleId && { academicTitleId }),

        ...(nationalityId && { nationalityId }),

        ...(isActive !== undefined && {
          isActive: isActive === 'true',
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
    return this.prisma.person.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  update(id: string, data: Prisma.PersonUpdateInput) {
    return this.prisma.person.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.PersonCreateInput) {
    return this.prisma.person.create({
      data,
      include: this.include,
    });
  }
}
