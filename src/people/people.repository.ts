import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { PeopleQueryDto } from './dto/people-query.dto';

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

  remove(id: string) {
    return this.prisma.person.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });
  }

  update(id: string, dto: UpdatePersonDto) {
    return this.prisma.person.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: this.include,
    });
  }

  create(dto: CreatePersonDto) {
    return this.prisma.person.create({
      data: {
        ...dto,
      },
      include: this.include,
    });
  }
}
