import { Injectable, NotFoundException } from '@nestjs/common';

import { IUserJwt } from 'src/auth/jwt.strategy';
import { generateSlug } from 'src/common/utils/slug.util';
import { ResearchRepository } from './researchs.repository';
import { CreateSearchDto } from './DTOs/create-search.dto';
import { ResearchQueryDto } from './DTOs/research-query.dto';
import { UpdateSearchDto } from './DTOs/update.search.dto';
import { CloudinaryUploadOptions } from 'src/cloudinary/interfaces/CloudnaryOptions';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Search } from '@prisma/client';

@Injectable()
export class ResearchService {
  constructor(
    private readonly researchRepository: ResearchRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private folderCloudinaryName = 'leviata/images/research/';

  private async changeCover(slug: string, file: any) {
    const cloudinaryOptions: CloudinaryUploadOptions = {
      folder: `${this.folderCloudinaryName}`,
      resourceType: 'image',
      publicId: slug,
      displayName: slug,
    };

    return this.cloudinaryService.upload(file, cloudinaryOptions);
  }

  private async prepareSearchUpdate(searchFound: Search, dto: UpdateSearchDto) {
    let slug = searchFound.slug;
    let coverUrl = searchFound.coverUrl;
    let coverPublicId = searchFound.coverPublicId;

    if (dto.title && dto.title !== searchFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (
        await this.researchRepository.existsSlug(newSlug, searchFound.id)
      ) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;

      if (coverPublicId) {
        const newPublicId = `${this.folderCloudinaryName}${newSlug}`;

        const result = await this.cloudinaryService.rename(
          coverPublicId,
          newPublicId,
        );

        if (result) {
          await this.cloudinaryService.updateDisplayName(
            result.public_id,
            newSlug,
          );

          coverPublicId = result.public_id;
          coverUrl = result.url;
        }
      }
    }

    return {
      ...dto,
      slug,
      coverUrl,
      coverPublicId,
      ...(dto.people! && {
        people: {
          set: dto.people.map((id) => ({ id })),
        },
      }),
      ...(dto.images! && {
        images: {
          connect: dto.images.map((id) => ({ id })),
        },
      }),
      ...(dto.supports! && {
        supports: {
          connect: dto.supports.map((id) => ({ id })),
        },
      }),
    };
  }

  async create(dto: CreateSearchDto, cover?: any) {
    let coverUrl: string | undefined;
    let coverPublicId: string | undefined;
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.researchRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    if (cover) {
      const result = await this.changeCover(slug, cover);

      coverUrl = result.url;
      coverPublicId = result.public_id;
    }

    const searchInput = {
      ...dto,
      slug,
      coverUrl,
      coverPublicId,
      ...(dto.people && {
        people: {
          connect: dto.people.map((id) => ({ id })),
        },
      }),
      ...(dto.images! && {
        images: {
          connect: dto.images.map((id) => ({ id })),
        },
      }),
      ...(dto.supports! && {
        supports: {
          connect: dto.supports.map((id) => ({ id })),
        },
      }),
    };

    const search = await this.researchRepository.create(searchInput);

    return search;
  }

  async findAll(query: ResearchQueryDto) {
    const research = await this.researchRepository.findAll(query);

    return research;
  }

  async findOneById(id: string) {
    const search = await this.researchRepository.findById(id);

    if (!search) {
      throw new NotFoundException('search not found.');
    }

    return search;
  }

  async update(id: string, dto: UpdateSearchDto) {
    const searchFound = await this.findOneById(id);

    const searchUpdate = await this.prepareSearchUpdate(searchFound, dto);

    return this.researchRepository.update(id, searchUpdate);
  }

  async updateBySlug(slug: string, dto: UpdateSearchDto) {
    const searchFound = await this.findOneBySlug(slug);

    const searchUpdate = await this.prepareSearchUpdate(searchFound, dto);

    return this.researchRepository.update(searchFound.id, searchUpdate);
  }

  async remove(id: string, user: IUserJwt) {
    await this.findOneById(id);

    await this.researchRepository.remove(id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const search = await this.researchRepository.findBySlug(slug);

    if (!search) {
      throw new NotFoundException('search not found.');
    }

    return search;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const search = await this.findOneBySlug(slug);

    await this.researchRepository.remove(search.id, user.id);

    return;
  }

  async uploadCover(slug: string, file: any) {
    const search = await this.researchRepository.findBySlug(slug);

    if (!search) {
      throw new NotFoundException('Search not found.');
    }

    const result = await this.changeCover(slug, file);

    await this.researchRepository.update(search.id, {
      coverUrl: result.url,
      coverPublicId: result.public_id,
    });

    return {
      url: result.url,
      public_id: result.public_id,
    };
  }

  async removeCover(slug: string) {
    const search = await this.researchRepository.findBySlug(slug);

    if (!search) {
      throw new NotFoundException('Search not found.');
    }

    await this.cloudinaryService.deleteFile(
      `${this.folderCloudinaryName}${slug}`,
    );

    await this.researchRepository.update(search.id, {
      coverUrl: null,
      coverPublicId: null,
    });
  }
}
