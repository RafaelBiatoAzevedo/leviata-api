import { Injectable, NotFoundException } from '@nestjs/common';

import { IUserJwt } from 'src/auth/jwt.strategy';
import { generateSlug } from 'src/common/utils/slug.util';
import { CloudinaryUploadOptions } from 'src/cloudinary/interfaces/CloudnaryOptions';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { MeetingsRepository } from './meetings.repository';
import { UpdateMeetingDto } from './DTOs/update.meeting.dto';
import { Meeting } from '@prisma/client';
import { CreateMeetingDto } from './DTOs/create-meeting.dto';
import { MeetingsQueryDto } from './DTOs/meeting-query.dto';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly MeetingsRepository: MeetingsRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private folderCloudinaryName = 'leviata/images/meetings/';

  private async changeCover(slug: string, file: any) {
    const cloudinaryOptions: CloudinaryUploadOptions = {
      folder: `${this.folderCloudinaryName}`,
      resourceType: 'image',
      publicId: slug,
      displayName: slug,
    };

    return this.cloudinaryService.upload(file, cloudinaryOptions);
  }

  private async prepareMeetingUpdate(
    MeetingFound: Meeting,
    dto: UpdateMeetingDto,
  ) {
    let slug = MeetingFound.slug;
    let coverUrl = MeetingFound.coverUrl;
    let coverPublicId = MeetingFound.coverPublicId;

    if (dto.title && dto.title !== MeetingFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (
        await this.MeetingsRepository.existsSlug(newSlug, MeetingFound.id)
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
    };
  }

  async create(dto: CreateMeetingDto, cover?: any) {
    let coverUrl: string | undefined;
    let coverPublicId: string | undefined;
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.MeetingsRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    if (cover) {
      const result = await this.changeCover(slug, cover);

      coverUrl = result.url;
      coverPublicId = result.public_id;
    }

    const MeetingInput = {
      ...dto,
      slug,
      coverUrl,
      coverPublicId,
    };

    const Meeting = await this.MeetingsRepository.create(MeetingInput);

    return Meeting;
  }

  async findAll(query: MeetingsQueryDto) {
    const Meetings = await this.MeetingsRepository.findAll(query);

    return Meetings;
  }

  async findOneById(id: string) {
    const Meeting = await this.MeetingsRepository.findById(id);

    if (!Meeting) {
      throw new NotFoundException('Meeting not found.');
    }

    return Meeting;
  }

  async update(id: string, dto: UpdateMeetingDto) {
    const MeetingFound = await this.findOneById(id);

    const MeetingUpdate = await this.prepareMeetingUpdate(MeetingFound, dto);

    return this.MeetingsRepository.update(id, MeetingUpdate);
  }

  async updateBySlug(slug: string, dto: UpdateMeetingDto) {
    const MeetingFound = await this.findOneBySlug(slug);

    const MeetingUpdate = await this.prepareMeetingUpdate(MeetingFound, dto);

    return this.MeetingsRepository.update(MeetingFound.id, MeetingUpdate);
  }

  async remove(id: string, user: IUserJwt) {
    await this.findOneById(id);

    await this.MeetingsRepository.remove(id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const Meeting = await this.MeetingsRepository.findBySlug(slug);

    if (!Meeting) {
      throw new NotFoundException('Meeting not found.');
    }

    return Meeting;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const Meeting = await this.findOneBySlug(slug);

    await this.MeetingsRepository.remove(Meeting.id, user.id);

    return;
  }

  async uploadCover(slug: string, file: any) {
    const Meeting = await this.MeetingsRepository.findBySlug(slug);

    if (!Meeting) {
      throw new NotFoundException('Meeting not found.');
    }

    const result = await this.changeCover(slug, file);

    await this.MeetingsRepository.update(Meeting.id, {
      coverUrl: result.url,
      coverPublicId: result.public_id,
    });

    return {
      url: result.url,
      public_id: result.public_id,
    };
  }

  async removeCover(slug: string) {
    const Meeting = await this.MeetingsRepository.findBySlug(slug);

    if (!Meeting) {
      throw new NotFoundException('Meeting not found.');
    }

    await this.cloudinaryService.deleteFile(
      `${this.folderCloudinaryName}${slug}`,
    );

    await this.MeetingsRepository.update(Meeting.id, {
      coverUrl: null,
      coverPublicId: null,
    });
  }
}
