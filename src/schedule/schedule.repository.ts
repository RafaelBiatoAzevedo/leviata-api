import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleQueryDto } from './DTOs/schedule-query.dto';

@Injectable()
export class ScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.schedule.findFirst({ where: { id, deletedAt: null } });
  }

  findBySlug(slug: string) {
    return this.prisma.schedule.findFirst({ where: { slug, deletedAt: null } });
  }

  async existsSlug(slug: string, ignoreId?: string) {
    // Slugs remain unique even for soft-deleted records.
    return (
      (await this.prisma.schedule.count({
        where: { slug, ...(ignoreId && { NOT: { id: ignoreId } }) },
      })) > 0
    );
  }

  findAll(query: ScheduleQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      dateFrom,
      dateTo,
      sortBy = 'date',
      sortOrder = 'asc',
    } = query;
    return this.prisma.schedule.findMany({
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { subtitle: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...((dateFrom || dateTo) && {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }),
      },
      orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  create(data: Prisma.ScheduleCreateInput) {
    return this.prisma.schedule.create({ data });
  }

  update(id: string, data: Prisma.ScheduleUpdateInput) {
    return this.prisma.schedule.update({ where: { id }, data });
  }

  remove(id: string, userId: string) {
    return this.prisma.schedule.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId },
    });
  }
}
