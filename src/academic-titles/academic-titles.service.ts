import { Injectable } from '@nestjs/common';
import { AcademicTitlesRepository } from './academic-titles.repository';

@Injectable()
export class AcademicTitlesService {
  constructor(
    private readonly academicTitlesRepository: AcademicTitlesRepository,
  ) {}

  async findAll() {
    const academicTitles = await this.academicTitlesRepository.findAll();

    return academicTitles;
  }
}
