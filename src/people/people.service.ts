import { Injectable, NotFoundException } from '@nestjs/common';

import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PeopleQueryDto } from './dto/people-query.dto';
import { PeopleRepository } from './people.repository';

@Injectable()
export class PeopleService {
  constructor(private readonly peopleRepository: PeopleRepository) {}

  async create(dto: CreatePersonDto) {
    const person = await this.peopleRepository.create(dto);

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
    await this.findOneById(id);

    const person = await this.peopleRepository.update(id, dto);

    return person;
  }

  async remove(id: string) {
    await this.findOneById(id);

    await this.peopleRepository.remove(id);

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
    const person = await this.findOneBySlug(slug);

    const personUpdated = await this.peopleRepository.update(person.id, dto);

    return personUpdated;
  }

  async removeBySlug(slug: string) {
    const person = await this.findOneBySlug(slug);

    await this.peopleRepository.remove(person.id);

    return;
  }

  async uploadImage(id: string) {
    throw new Error('Not implemented yet.');
  }

  async removeImage(id: string) {
    throw new Error('Not implemented yet.');
  }
}
