import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { IUserJwt } from '../auth/jwt.strategy';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { InstitutionQueryDto } from './dto/institution-query.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionsRepository } from './institutions.repository';

@Injectable()
export class InstitutionsService {
  constructor(
    private readonly institutionsRepository: InstitutionsRepository,
  ) {}

  findAll(query: InstitutionQueryDto = {}) {
    return this.institutionsRepository.findAll(query);
  }

  findPage(query: InstitutionQueryDto) {
    return this.institutionsRepository.findPage(query);
  }

  async findOneById(id: string) {
    const institution = await this.institutionsRepository.findById(id);
    if (!institution)
      throw new NotFoundException('Instituição não encontrada.');
    return institution;
  }

  private async validateReferences(dto: UpdateInstitutionDto, id?: string) {
    if (
      dto.name !== undefined &&
      (await this.institutionsRepository.findByName(dto.name, id))
    ) {
      throw new ConflictException('Já existe uma instituição com esse nome.');
    }
    if (
      dto.countryId !== undefined &&
      !(await this.institutionsRepository.findCountry(dto.countryId))
    ) {
      throw new BadRequestException('Selecione um país cadastrado.');
    }
  }

  private writeError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException('Já existe uma instituição com esse nome.');
      if (error.code === 'P2003')
        throw new BadRequestException('Selecione um país cadastrado.');
      if (error.code === 'P2025')
        throw new NotFoundException('Instituição não encontrada.');
    }
    throw error;
  }

  async create(dto: CreateInstitutionDto) {
    await this.validateReferences(dto);
    try {
      return await this.institutionsRepository.create(dto);
    } catch (error) {
      this.writeError(error);
    }
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    await this.findOneById(id);
    await this.validateReferences(dto, id);
    try {
      return await this.institutionsRepository.update(id, dto);
    } catch (error) {
      this.writeError(error);
    }
  }

  async remove(id: string, user: IUserJwt) {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('A exclusão exige um superadministrador.');
    }
    await this.findOneById(id);
    if (await this.institutionsRepository.countPeople(id)) {
      throw new ConflictException(
        'Não é possível excluir uma instituição vinculada a pessoas. Altere os vínculos antes de excluir.',
      );
    }
    try {
      await this.institutionsRepository.remove(id, user.id);
    } catch (error) {
      this.writeError(error);
    }
  }
}
