import { Injectable } from '@nestjs/common';
import { CountriesRepository } from './countries.repository';

@Injectable()
export class CountriesService {
  constructor(private readonly countriesRepository: CountriesRepository) {}

  async findAll() {
    const institutions = await this.countriesRepository.findAll();

    return institutions;
  }
}
