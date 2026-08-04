import { Injectable, NotFoundException } from '@nestjs/common';

import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PeopleQueryDto } from './dto/people-query.dto';
import { PeopleRepository } from './people.repository';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { generateSlug } from 'src/common/utils/slug.util';

@Injectable()
export class PeopleService {
  constructor(private readonly peopleRepository: PeopleRepository) {}

  async create(dto: CreatePersonDto) {
    let slug = generateSlug(dto.name);

    let counter = 2;

    while (await this.peopleRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.name)}-${counter++}`;
    }

    const personInput = { ...dto, slug };

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

    if (dto.name && dto.name !== personFound.name) {
      const baseSlug = generateSlug(dto.name);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.peopleRepository.existsSlug(slug, id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;
    }

    const personUpdate = { ...dto, slug };
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

    if (dto.name && dto.name !== personFound.name) {
      const baseSlug = generateSlug(dto.name);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.peopleRepository.existsSlug(newSlug, personFound.id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      tempSlug = newSlug;
    }

    const personUpdate = { ...dto, slug: tempSlug };
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

  async uploadImage(id: string) {
    throw new Error('Not implemented yet.');
  }

  async removeImage(id: string) {
    throw new Error('Not implemented yet.');
  }
}
