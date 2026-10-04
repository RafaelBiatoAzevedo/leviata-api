import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Schedule } from '@prisma/client';
import { IUserJwt } from '../auth/jwt.strategy';
import { generateSlug } from '../common/utils/slug.util';
import { CreateScheduleDto } from './DTOs/create-schedule.dto';
import { ScheduleQueryDto } from './DTOs/schedule-query.dto';
import { UpdateScheduleDto } from './DTOs/update-schedule.dto';
import { ScheduleRepository } from './schedule.repository';

@Injectable()
export class ScheduleService {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  private validateDates(date: string | Date, endDate?: string | Date | null) {
    if (endDate && new Date(endDate) < new Date(date)) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial.',
      );
    }
  }

  private async uniqueSlug(title: string, ignoreId?: string) {
    const baseSlug = generateSlug(title) || 'evento';
    let slug = baseSlug;
    let counter = 2;
    while (await this.scheduleRepository.existsSlug(slug, ignoreId)) {
      slug = `${baseSlug}-${counter++}`;
    }
    return slug;
  }

  async create(dto: CreateScheduleDto) {
    this.validateDates(dto.date, dto.endDate);
    return this.scheduleRepository.create({
      ...dto,
      date: new Date(dto.date),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      slug: await this.uniqueSlug(dto.title),
    });
  }

  findAll(query: ScheduleQueryDto) {
    if (query.dateFrom && query.dateTo)
      this.validateDates(query.dateFrom, query.dateTo);
    return this.scheduleRepository.findAll(query);
  }

  async findOneById(id: string) {
    const found = await this.scheduleRepository.findById(id);
    if (!found) throw new NotFoundException('Schedule not found.');
    return found;
  }

  async findOneBySlug(slug: string) {
    const found = await this.scheduleRepository.findBySlug(slug);
    if (!found) throw new NotFoundException('Schedule not found.');
    return found;
  }

  private async updateFound(found: Schedule, dto: UpdateScheduleDto) {
    this.validateDates(
      dto.date ?? found.date,
      dto.endDate === undefined ? found.endDate : dto.endDate,
    );
    return this.scheduleRepository.update(found.id, {
      ...dto,
      ...(dto.date !== undefined && { date: new Date(dto.date) }),
      ...(dto.endDate !== undefined && {
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      }),
      slug:
        dto.title && dto.title !== found.title
          ? await this.uniqueSlug(dto.title, found.id)
          : found.slug,
    });
  }

  async update(id: string, dto: UpdateScheduleDto) {
    return this.updateFound(await this.findOneById(id), dto);
  }

  async updateBySlug(slug: string, dto: UpdateScheduleDto) {
    return this.updateFound(await this.findOneBySlug(slug), dto);
  }

  async remove(id: string, user: IUserJwt) {
    const found = await this.findOneById(id);
    await this.scheduleRepository.remove(found.id, user.id);
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const found = await this.findOneBySlug(slug);
    await this.scheduleRepository.remove(found.id, user.id);
  }
}
