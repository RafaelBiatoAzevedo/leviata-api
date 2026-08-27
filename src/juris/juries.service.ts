import { Injectable, NotFoundException } from '@nestjs/common';

import { IUserJwt } from 'src/auth/jwt.strategy';
import { generateSlug } from 'src/common/utils/slug.util';
import { JuriesRepository } from './juries.repository';
import { CreateJuryDto } from './DTOs/create-jury.dto';
import { JuriesQueryDto } from './DTOs/jury-query.dto';
import { CloudinaryUploadOptions } from 'src/cloudinary/interfaces/CloudnaryOptions';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Jury } from '@prisma/client';
import { UpdateJuryDto } from './DTOs/update.juri.dto';

@Injectable()
export class JuriesService {
  constructor(
    private readonly juriesRepository: JuriesRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private folderCloudinaryName = 'leviata/images/juries/';

  private async changeCover(slug: string, file: any) {
    const cloudinaryOptions: CloudinaryUploadOptions = {
      folder: `${this.folderCloudinaryName}`,
      resourceType: 'image',
      publicId: slug,
      displayName: slug,
    };

    return this.cloudinaryService.upload(file, cloudinaryOptions);
  }

  private async prepareJuryUpdate(juryFound: Jury, dto: UpdateJuryDto) {
    let slug = juryFound.slug;
    let coverUrl = juryFound.coverUrl;
    let coverPublicId = juryFound.coverPublicId;

    if (dto.title && dto.title !== juryFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.juriesRepository.existsSlug(newSlug, juryFound.id)) {
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
      ...(dto.judges! && {
        judges: {
          set: dto.judges.map((id) => ({ id })),
        },
      }),
      ...(dto.jurors! && {
        jurors: {
          set: dto.jurors.map((id) => ({ id })),
        },
      }),
      ...(dto.prosecutors! && {
        prosecutors: {
          set: dto.prosecutors.map((id) => ({ id })),
        },
      }),
      ...(dto.defenders! && {
        defenders: {
          set: dto.defenders.map((id) => ({ id })),
        },
      }),
      ...(dto.bailiffs! && {
        bailiffs: {
          set: dto.bailiffs.map((id) => ({ id })),
        },
      }),
    };
  }

  async create(dto: CreateJuryDto, cover?: any) {
    let coverUrl: string | undefined;
    let coverPublicId: string | undefined;
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.juriesRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    if (cover) {
      const result = await this.changeCover(slug, cover);

      coverUrl = result.url;
      coverPublicId = result.public_id;
    }

    const juryInput = {
      ...dto,
      slug,
      coverUrl,
      coverPublicId,
      ...(dto.judges! && {
        judges: {
          connect: dto.judges.map((id) => ({ id })),
        },
      }),
      ...(dto.jurors! && {
        jurors: {
          connect: dto.jurors.map((id) => ({ id })),
        },
      }),
      ...(dto.prosecutors! && {
        prosecutors: {
          connect: dto.prosecutors.map((id) => ({ id })),
        },
      }),
      ...(dto.defenders! && {
        defenders: {
          connect: dto.defenders.map((id) => ({ id })),
        },
      }),
      ...(dto.bailiffs! && {
        bailiffs: {
          connect: dto.bailiffs.map((id) => ({ id })),
        },
      }),
    };

    const jury = await this.juriesRepository.create(juryInput);

    return jury;
  }

  async findAll(query: JuriesQueryDto) {
    const juries = await this.juriesRepository.findAll(query);

    return juries;
  }

  async findOneById(id: string) {
    const jury = await this.juriesRepository.findById(id);

    if (!jury) {
      throw new NotFoundException('jury not found.');
    }

    return jury;
  }

  async update(id: string, dto: UpdateJuryDto) {
    const juryFound = await this.findOneById(id);

    const juryUpdate = await this.prepareJuryUpdate(juryFound, dto);

    return this.juriesRepository.update(id, juryUpdate);
  }

  async updateBySlug(slug: string, dto: UpdateJuryDto) {
    const juryFound = await this.findOneBySlug(slug);

    const juryUpdate = await this.prepareJuryUpdate(juryFound, dto);

    return this.juriesRepository.update(juryFound.id, juryUpdate);
  }

  async remove(id: string, user: IUserJwt) {
    await this.findOneById(id);

    await this.juriesRepository.remove(id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const jury = await this.juriesRepository.findBySlug(slug);

    if (!jury) {
      throw new NotFoundException('jury not found.');
    }

    return jury;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const jury = await this.findOneBySlug(slug);

    await this.juriesRepository.remove(jury.id, user.id);

    return;
  }

  async uploadCover(slug: string, file: any) {
    const jury = await this.juriesRepository.findBySlug(slug);

    if (!jury) {
      throw new NotFoundException('Jury not found.');
    }

    const result = await this.changeCover(slug, file);

    await this.juriesRepository.update(jury.id, {
      coverUrl: result.url,
      coverPublicId: result.public_id,
    });

    return {
      url: result.url,
      public_id: result.public_id,
    };
  }

  async removeCover(slug: string) {
    const jury = await this.juriesRepository.findBySlug(slug);

    if (!jury) {
      throw new NotFoundException('Jury not found.');
    }

    await this.cloudinaryService.deleteFile(
      `${this.folderCloudinaryName}${slug}`,
    );

    await this.juriesRepository.update(jury.id, {
      coverUrl: null,
      coverPublicId: null,
    });
  }
}
