import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { listPage } from '../common/utils/list-page';
import { InstitutionQueryDto } from './dto/institution-query.dto';

@Injectable()
export class InstitutionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: InstitutionQueryDto = {}) {
    return this.prisma.institution.findMany(this.listArgs(query));
  }

  findPage(query: InstitutionQueryDto) {
    const args = this.listArgs(query, true);
    return listPage(
      query,
      this.prisma.institution.findMany(args),
      this.prisma.institution.count({ where: args.where }),
    );
  }

  private listArgs(query: InstitutionQueryDto, paginated = false) {
    const {
      page,
      limit,
      search,
      countryId,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;
    return {
      where: {
        deletedAt: null,
        ...(countryId && { countryId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { acronym: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { country: true },
      orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
      ...((paginated || page !== undefined || limit !== undefined) && {
        skip: ((page ?? 1) - 1) * (limit ?? 10),
        take: limit ?? 10,
      }),
    } satisfies Prisma.InstitutionFindManyArgs;
  }

  findById(id: string) {
    return this.prisma.institution.findFirst({
      where: { id, deletedAt: null },
      include: { country: true },
    });
  }

  findByName(name: string, ignoreId?: string) {
    // Names remain unique in the schema, including archived institutions.
    return this.prisma.institution.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(ignoreId && { NOT: { id: ignoreId } }),
      },
      select: { id: true },
    });
  }

  findCountry(id: string) {
    return this.prisma.country.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  countPeople(id: string) {
    return this.prisma.person.count({
      where: { institutionId: id, deletedAt: null },
    });
  }

  create(data: Prisma.InstitutionUncheckedCreateInput) {
    return this.prisma.institution.create({ data, include: { country: true } });
  }

  update(id: string, data: Prisma.InstitutionUncheckedUpdateInput) {
    return this.prisma.institution.update({
      where: { id, deletedAt: null },
      data,
      include: { country: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.prisma.institution.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: userId },
    });
  }
}
