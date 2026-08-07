import { Injectable, NotFoundException } from '@nestjs/common';

import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PeopleQueryDto } from './dto/people-query.dto';
import { PeopleRepository } from './people.repository';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { generateSlug } from 'src/common/utils/slug.util';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CloudinaryUploadOptions } from 'src/cloudinary/interfaces/CloudnaryOptions';

@Injectable()
export class PeopleService {
  constructor(
    private readonly peopleRepository: PeopleRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private folderCloudinaryName = 'leviata/images/people/';

  async create(dto: CreatePersonDto, image?: any) {
    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;
    let slug = generateSlug(dto.name);
    let counter = 2;

    while (await this.peopleRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.name)}-${counter++}`;
    }

    if (image) {
      const result = await this.changeImage(slug, image);

      imageUrl = result.url;
      imagePublicId = result.public_id;
    }

    const personInput = { ...dto, slug, imageUrl, imagePublicId };

    const person = await this.peopleRepository.create(personInput);

    return person;
  }

  async findAll(query: PeopleQueryDto) {
    const people = await this.peopleRepository.findAll(query);

    return people;
  }

  async findOneById(id: string) {
    const person = await this.peopleRepository.findById(id);

    if (!person) {
      throw new NotFoundException('Person not found.');
    }

    return person;
  }

  async update(id: string, dto: UpdatePersonDto) {
    const personFound = await this.findOneById(id);

    let slug = personFound.slug;
    let imagePublicId = personFound.imagePublicId;
    let imageUrl = personFound.imageUrl;

    if (dto.name && dto.name !== personFound.name) {
      const baseSlug = generateSlug(dto.name);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.peopleRepository.existsSlug(slug, id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;

      if (imagePublicId) {
        const newPublicId = `${this.folderCloudinaryName}${newSlug}`;

        const result = await this.cloudinaryService.rename(
          imagePublicId,
          newPublicId,
        );

        if (result) {
          await this.cloudinaryService.updateDisplayName(
            result.public_id,
            newSlug,
          );

          imagePublicId = result.public_id;
          imageUrl = result.url;
        }
      }
    }

    const personUpdate = { ...dto, slug, imagePublicId, imageUrl };
    const person = await this.peopleRepository.update(id, personUpdate);

    return person;
  }

  async remove(id: string, user: IUserJwt) {
    await this.findOneById(id);

    await this.peopleRepository.remove(id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const person = await this.peopleRepository.findBySlug(slug);

    if (!person) {
      throw new NotFoundException('Person not found.');
    }

    return person;
  }

  async updateBySlug(slug: string, dto: UpdatePersonDto) {
    const personFound = await this.findOneBySlug(slug);

    let tempSlug = personFound.slug;
    let imagePublicId = personFound.imagePublicId;
    let imageUrl = personFound.imageUrl;

    if (dto.name && dto.name !== personFound.name) {
      const baseSlug = generateSlug(dto.name);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.peopleRepository.existsSlug(newSlug, personFound.id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      tempSlug = newSlug;

      if (imagePublicId) {
        const newPublicId = `${this.folderCloudinaryName}${newSlug}`;

        const result = await this.cloudinaryService.rename(
          imagePublicId,
          newPublicId,
        );

        if (result) {
          await this.cloudinaryService.updateDisplayName(
            result.public_id,
            newSlug,
          );

          imagePublicId = result.public_id;
          imageUrl = result.url;
        }
      }
    }

    const personUpdate = { ...dto, slug: tempSlug, imagePublicId, imageUrl };
    const person = await this.peopleRepository.update(
      personFound.id,
      personUpdate,
    );

    return person;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const person = await this.findOneBySlug(slug);

    await this.peopleRepository.remove(person.id, user.id);

    return;
  }

  async changeImage(slug: string, image: any) {
    const cloudinaryOptions: CloudinaryUploadOptions = {
      folder: `${this.folderCloudinaryName}`,
      resourceType: 'image',
      publicId: slug,
      displayName: slug,
    };

    return this.cloudinaryService.upload(image, cloudinaryOptions);
  }

  async uploadImage(slug: string, image: any) {
    const person = await this.peopleRepository.findBySlug(slug);

    if (!person) {
      throw new NotFoundException('Person not found.');
    }

    const result = await this.changeImage(slug, image);

    await this.peopleRepository.update(person.id, {
      imageUrl: result.url,
      imagePublicId: result.public_id,
    });

    return {
      url: result.url,
      public_id: result.public_id,
    };
  }

  async removeImage(slug: string) {
    const person = await this.peopleRepository.findBySlug(slug);

    if (!person) {
      throw new NotFoundException('Person not found.');
    }

    await this.cloudinaryService.deleteFile(
      `${this.folderCloudinaryName}${slug}`,
    );

    await this.peopleRepository.update(person.id, {
      imageUrl: null,
      imagePublicId: null,
    });
  }
}
