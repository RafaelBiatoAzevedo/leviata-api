import { Injectable, NotFoundException } from '@nestjs/common';
import { generateSlug } from 'src/common/utils/slug.util';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { UpdatePresentedWorkDto } from './DTOs/update-presented-work.dto';
import { PresentedWorksQueryDto } from './DTOs/presented-work-query.dto';
import { CreatePresentedWorkDto } from './DTOs/create-presented-work.dto';
import { PresentedWork } from '@prisma/client';
import { PresentedWorksRepository } from './presented-works.repository';

@Injectable()
export class PresentedWorksService {
  constructor(
    private readonly presentedWorksRepository: PresentedWorksRepository,
  ) {}

  private async preparePresentedWorkUpdate(
    presentedWorkFound: PresentedWork,
    dto: UpdatePresentedWorkDto,
  ) {
    let slug = presentedWorkFound.slug;

    if (dto.title && dto.title !== presentedWorkFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (
        await this.presentedWorksRepository.existsSlug(
          newSlug,
          presentedWorkFound.id,
        )
      ) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;
    }

    return {
      ...dto,
      slug,
      ...(dto.authors! && {
        authors: {
          set: dto.authors.map((id) => ({ id })),
        },
      }),
    };
  }

  async create(dto: CreatePresentedWorkDto) {
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.presentedWorksRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    const presentedWorkInput = {
      ...dto,
      slug,
      authors: {
        connect: dto.authors.map((id) => ({
          id,
        })),
      },
    };

    const presentedWork =
      await this.presentedWorksRepository.create(presentedWorkInput);

    return presentedWork;
  }

  async findAll(query: PresentedWorksQueryDto) {
    const presentedWorks = await this.presentedWorksRepository.findAll(query);

    return presentedWorks;
  }

  async findOneById(id: string) {
    const presentedWork = await this.presentedWorksRepository.findById(id);

    if (!presentedWork) {
      throw new NotFoundException('PresentedWork not found.');
    }

    return presentedWork;
  }

  async update(id: string, dto: UpdatePresentedWorkDto) {
    const presentedWorkFound = await this.findOneById(id);

    const presentedWorkUpdate = await this.preparePresentedWorkUpdate(
      presentedWorkFound,
      dto,
    );

    return this.presentedWorksRepository.update(
      presentedWorkFound.id,
      presentedWorkUpdate,
    );
  }

  async updateBySlug(slug: string, dto: UpdatePresentedWorkDto) {
    const presentedWorkFound = await this.findOneBySlug(slug);

    const presentedWorkUpdate = await this.preparePresentedWorkUpdate(
      presentedWorkFound,
      dto,
    );

    return this.presentedWorksRepository.update(
      presentedWorkFound.id,
      presentedWorkUpdate,
    );
  }

  async remove(id: string, user: IUserJwt) {
    const presentedWorkFound = await this.findOneById(id);

    await this.presentedWorksRepository.remove(presentedWorkFound.id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const presentedWorkFound =
      await this.presentedWorksRepository.findBySlug(slug);

    if (!presentedWorkFound) {
      throw new NotFoundException('PresentedWork not found.');
    }

    return presentedWorkFound;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const presentedWorkFound = await this.findOneBySlug(slug);

    await this.presentedWorksRepository.remove(presentedWorkFound.id, user.id);

    return;
  }
}
