import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateSlug } from 'src/common/utils/slug.util';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { ThematicsRepository } from './thematics.repository';
import { UpdateThematicDto } from './DTOs/update-thematic.dto';
import { ThematicsQueryDto } from './DTOs/thematic-query.dto';
import { CreateThematicDto } from './DTOs/create-thematic.dto';
import { Prisma, Thematic } from '@prisma/client';
import { ThematicVideoInputDto } from './DTOs/thematic-video-input.dto';

@Injectable()
export class ThematicsService {
  constructor(private readonly ThematicsRepository: ThematicsRepository) {}

  private async validateRelations(dto: UpdateThematicDto, thematicId?: string) {
    const links = dto.additionalVideos ?? [];
    const ids = links.flatMap((link) => (link.id ? [link.id] : []));
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException(
        'Um vínculo de vídeo não pode aparecer mais de uma vez.',
      );
    if (!thematicId && ids.length)
      throw new BadRequestException(
        'Novos vídeos da temática não devem informar um ID de vínculo.',
      );
    let existingIds: string[] = [];
    if (thematicId && dto.additionalVideos !== undefined) {
      const existing =
        await this.ThematicsRepository.findVideoLinks(thematicId);
      existingIds = existing.map((link) => link.id);
      if (ids.some((id) => !existingIds.includes(id)))
        throw new BadRequestException(
          'Há um vínculo de vídeo que não pertence a esta temática.',
        );
    }
    const videoIds = [
      ...new Set([
        ...(dto.mainVideoId ? [dto.mainVideoId] : []),
        ...links.map((link) => link.videoId),
      ]),
    ];
    const personIds = [
      ...new Set([
        ...(dto.coordinatorId ? [dto.coordinatorId] : []),
        ...links.flatMap((link) => (link.personId ? [link.personId] : [])),
      ]),
    ];
    if (videoIds.length) {
      const videos =
        await this.ThematicsRepository.findAvailableVideos(videoIds);
      if (videos.length !== videoIds.length)
        throw new BadRequestException(
          'Selecione vídeos cadastrados e disponíveis.',
        );
    }
    if (personIds.length) {
      const people =
        await this.ThematicsRepository.findAvailablePeople(personIds);
      if (people.length !== personIds.length)
        throw new BadRequestException(
          'Selecione pessoas cadastradas e disponíveis.',
        );
    }
    return existingIds;
  }

  private videoData(
    link: ThematicVideoInputDto,
  ): Prisma.ThematicVideoCreateWithoutThematicInput {
    return {
      title: link.title.trim(),
      description: link.description?.trim() || null,
      video: { connect: { id: link.videoId } },
      ...(link.personId && { person: { connect: { id: link.personId } } }),
    };
  }

  private additionalVideosUpdate(
    links: ThematicVideoInputDto[],
    existingIds: string[],
  ): Prisma.ThematicVideoUpdateManyWithoutThematicNestedInput {
    const retainedIds = links.flatMap((link) => (link.id ? [link.id] : []));
    return {
      deleteMany: {
        id: { in: existingIds.filter((id) => !retainedIds.includes(id)) },
      },
      create: links
        .filter((link) => !link.id)
        .map((link) => this.videoData(link)),
      update: links
        .filter((link) => link.id)
        .map((link) => ({
          where: { id: link.id! },
          data: {
            ...this.videoData(link),
            person: link.personId
              ? { connect: { id: link.personId } }
              : { disconnect: true },
          },
        })),
    };
  }

  private async prepareThematicUpdate(
    ThematicFound: Thematic,
    dto: UpdateThematicDto,
  ) {
    const existingIds = await this.validateRelations(dto, ThematicFound.id);
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

    const { additionalVideos, mainVideoId, coordinatorId, ...data } = dto;
    return {
      ...data,
      slug,
      ...(mainVideoId !== undefined && {
        mainVideo: mainVideoId
          ? { connect: { id: mainVideoId } }
          : { disconnect: true },
      }),
      ...(coordinatorId !== undefined && {
        coordinator: coordinatorId
          ? { connect: { id: coordinatorId } }
          : { disconnect: true },
      }),
      ...(additionalVideos !== undefined && {
        additionalVideos: this.additionalVideosUpdate(
          additionalVideos,
          existingIds,
        ),
      }),
    } satisfies Prisma.ThematicUpdateInput;
  }

  async create(dto: CreateThematicDto) {
    await this.validateRelations(dto);
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.ThematicsRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    const { additionalVideos, mainVideoId, coordinatorId, ...data } = dto;
    const ThematicInput = {
      ...data,
      slug,
      ...(mainVideoId && { mainVideo: { connect: { id: mainVideoId } } }),
      ...(coordinatorId && { coordinator: { connect: { id: coordinatorId } } }),
      additionalVideos: {
        create: (additionalVideos ?? []).map((link) => this.videoData(link)),
      },
    } satisfies Prisma.ThematicCreateInput;

    const Thematic = await this.ThematicsRepository.create(ThematicInput);

    return Thematic;
  }

  findPage(query: ThematicsQueryDto) {
    return this.ThematicsRepository.findPage(query);
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
