import { listPage } from '../common/utils/list-page';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleQueryDto } from './DTOs/schedule-query.dto';

// External meetings may be linked explicitly; deleted meetings must not produce a public link.
const includeMeeting = {
  meeting: {
    where: { deletedAt: null },
    select: { id: true, slug: true, title: true, type: true, isInternal: true },
  },
} satisfies Prisma.ScheduleInclude;

@Injectable()
export class ScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.schedule.findFirst({
      where: { id, deletedAt: null },
      include: includeMeeting,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.schedule.findFirst({
      where: { slug, deletedAt: null },
      include: includeMeeting,
    });
  }

  findAvailableMeeting(id: string) {
    return this.prisma.meeting.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
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
    return this.prisma.schedule.findMany(this.listArgs(query));
  }

  findPage(query: ScheduleQueryDto) {
    const args = this.listArgs(query);
    return listPage(
      query,
      this.prisma.schedule.findMany({
        ...args,
        orderBy: [
          ...(Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]),
          { id: 'asc' },
        ],
      }),
      this.prisma.schedule.count({ where: args.where }),
    );
  }

  private listArgs(query: ScheduleQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      dateFrom,
      dateTo,
      sortBy = 'date',
      sortOrder = 'asc',
    } = query;
    return {
      include: includeMeeting,
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
    } satisfies Prisma.ScheduleFindManyArgs;
  }

  create(data: Prisma.ScheduleUncheckedCreateInput) {
    return this.prisma.schedule.create({ data, include: includeMeeting });
  }

  update(id: string, data: Prisma.ScheduleUncheckedUpdateInput) {
    return this.prisma.schedule.update({
      where: { id },
      data,
      include: includeMeeting,
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.schedule.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId },
    });
  }
}
