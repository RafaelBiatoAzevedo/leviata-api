import { Injectable, NotFoundException } from '@nestjs/common';
import { generateSlug } from 'src/common/utils/slug.util';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { ThematicsRepository } from './thematics.repository';
import { UpdateThematicDto } from './DTOs/update-thematic.dto';
import { ThematicsQueryDto } from './DTOs/thematic-query.dto';
import { CreateThematicDto } from './DTOs/create-thematic.dto';
import { Thematic } from '@prisma/client';

@Injectable()
export class ThematicsService {
  constructor(private readonly ThematicsRepository: ThematicsRepository) {}

  private async prepareThematicUpdate(
    ThematicFound: Thematic,
    dto: UpdateThematicDto,
  ) {
    let slug = ThematicFound.slug;

    if (dto.title && dto.title !== ThematicFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (
        await this.ThematicsRepository.existsSlug(newSlug, ThematicFound.id)
      ) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;
    }

    return {
      ...dto,
      slug,
      ...(dto.additionalVideos! && {
        additionalVideos: {
          set: dto.additionalVideos.map((id) => ({ id })),
        },
      }),
    };
  }

  async create(dto: CreateThematicDto) {
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.ThematicsRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    const ThematicInput = {
      ...dto,
      slug,
      additionalVideos: {
        connect: dto.additionalVideos!.map((id) => ({
          id,
        })),
      },
    };

    const Thematic = await this.ThematicsRepository.create(ThematicInput);

    return Thematic;
  }

  async findAll(query: ThematicsQueryDto) {
    const Thematics = await this.ThematicsRepository.findAll(query);

    return Thematics;
  }

  async findOneById(id: string) {
    const Thematic = await this.ThematicsRepository.findById(id);

    if (!Thematic) {
      throw new NotFoundException('Thematic not found.');
    }

    return Thematic;
  }

  async update(id: string, dto: UpdateThematicDto) {
    const ThematicFound = await this.findOneById(id);

    const ThematicUpdate = await this.prepareThematicUpdate(ThematicFound, dto);

    return this.ThematicsRepository.update(ThematicFound.id, ThematicUpdate);
  }

  async updateBySlug(slug: string, dto: UpdateThematicDto) {
    const ThematicFound = await this.findOneBySlug(slug);

    const ThematicUpdate = await this.prepareThematicUpdate(ThematicFound, dto);

    return this.ThematicsRepository.update(ThematicFound.id, ThematicUpdate);
  }

  async remove(id: string, user: IUserJwt) {
    const ThematicFound = await this.findOneById(id);

    await this.ThematicsRepository.remove(ThematicFound.id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const ThematicFound = await this.ThematicsRepository.findBySlug(slug);

    if (!ThematicFound) {
      throw new NotFoundException('Thematic not found.');
    }

    return ThematicFound;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const ThematicFound = await this.findOneBySlug(slug);

    await this.ThematicsRepository.remove(ThematicFound.id, user.id);

    return;
  }
}
