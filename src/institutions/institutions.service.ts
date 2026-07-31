import { Injectable } from '@nestjs/common';
import { InstitutionsRepository } from './institutions.repository';

@Injectable()
export class InstitutionsService {
  constructor(
    private readonly institutionsRepository: InstitutionsRepository,
  ) {}

  async findAll() {
    const institutions = await this.institutionsRepository.findAll();

    return institutions;
  }
}
