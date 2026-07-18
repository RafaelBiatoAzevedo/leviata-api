import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PeopleQueryDto } from './dto/people-query.dto';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePersonDto) {
    return this.prisma.person.create({
      data: {
        ...dto,
      },
      include: {
        nationality: true,
        academicTitle: true,
        institution: true,
      },
    });
  }

  async findAll(query: PeopleQueryDto) {
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

      include: {
        nationality: true,
        academicTitle: true,
        institution: true,
      },

      orderBy: {
        [sortBy]: sortOrder,
      },

      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string) {
    const person = await this.prisma.person.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      include: {
        nationality: true,
        academicTitle: true,
        institution: true,
      },
    });

    if (!person) {
      throw new NotFoundException('Person not found.');
    }

    return person;
  }

  async update(id: string, dto: UpdatePersonDto) {
    await this.findOne(id);

    return this.prisma.person.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        nationality: true,
        academicTitle: true,
        institution: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.person.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return;
  }

  async uploadImage(id: string) {
    throw new Error('Not implemented yet.');
  }

  async removeImage(id: string) {
    throw new Error('Not implemented yet.');
  }
}
