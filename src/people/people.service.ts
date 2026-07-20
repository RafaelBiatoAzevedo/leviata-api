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

  async findOne(id: string) {
    const person = await this.peopleRepository.findById(id);

    if (!person) {
      throw new NotFoundException('Person not found.');
    }

    return person;
  }

  async update(id: string, dto: UpdatePersonDto) {
    await this.findOne(id);

    const person = await this.peopleRepository.update(id, dto);

    return person;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.peopleRepository.remove(id);

    return;
  }

  async uploadImage(id: string) {
    throw new Error('Not implemented yet.');
  }

  async removeImage(id: string) {
    throw new Error('Not implemented yet.');
  }
}
