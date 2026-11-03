import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { InstitutionsService } from './institutions.service';
import { InstitutionsRepository } from './institutions.repository';
import { InstitutionsController } from './institutions.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionQueryDto } from './dto/institution-query.dto';

const id = '51442736-694f-4ded-b551-c249bb8c51e8';
const countryId = 'c591fe21-4980-46c5-b8d6-7e3b0a0f2700';
const institution = {
  id,
  name: 'Universidade de Pesquisa',
  acronym: 'UP',
  countryId,
};
const actor = {
  id: 'owner',
  email: 'owner@example.test',
  role: Role.SUPER_ADMIN,
};
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const validate = <T>(
  type: new () => T,
  value: unknown,
  kind: 'body' | 'query' = 'body',
) => pipe.transform(value, { type: kind, metatype: type }) as Promise<T>;

describe('Institutions CRUD validation', () => {
  it('requires a name, acronym and country, trims text without changing spelling or case', async () => {
    await expect(
      validate(CreateInstitutionDto, {
        name: '  Universidade de Pesquisa  ',
        acronym: ' UP ',
        countryId,
      }),
    ).resolves.toEqual(institutionInput());
  });
  function institutionInput() {
    return { name: institution.name, acronym: institution.acronym, countryId };
  }
  it.each([
    {},
    { name: ' ', acronym: 'UP', countryId },
    { ...institutionInput(), acronym: '\t' },
    { ...institutionInput(), countryId: 'invalid' },
    { ...institutionInput(), countryId: null },
    { ...institutionInput(), name: 'x'.repeat(256) },
    { ...institutionInput(), acronym: 'x'.repeat(51) },
    { ...institutionInput(), deletedAt: new Date().toISOString() },
  ])('rejects invalid or privileged creation data: %j', async (input) => {
    await expect(validate(CreateInstitutionDto, input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('allows partial edits without clearing omitted fields', async () => {
    await expect(
      validate(UpdateInstitutionDto, { acronym: ' UPR ' }),
    ).resolves.toEqual({ acronym: 'UPR' });
  });
  it.each([
    { name: null },
    { acronym: null },
    { countryId: null },
    { name: '' },
    { acronym: '' },
  ])('rejects clearing required fields during edits: %j', async (input) => {
    await expect(validate(UpdateInstitutionDto, input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('normalizes query pagination and retains an unpaginated catalog when omitted', async () => {
    expect(
      (await validate(InstitutionQueryDto, {}, 'query')).limit,
    ).toBeUndefined();
    expect(
      await validate(
        InstitutionQueryDto,
        { page: '2', limit: '15', search: ' UP ', countryId },
        'query',
      ),
    ).toMatchObject({ page: 2, limit: 15, search: 'UP', countryId });
  });
  it.each([
    { page: '0' },
    { limit: '101' },
    { limit: '1.5' },
    { sortBy: 'password' },
    { sortOrder: 'random' },
    { countryId: 'missing' },
  ])('rejects invalid list filters: %j', async (input) => {
    await expect(
      validate(InstitutionQueryDto, input, 'query'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Institutions service', () => {
  const repository = {
    findAll: jest.fn(),
    findPage: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findCountry: jest.fn(),
    countPeople: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const service = new InstitutionsService(
    repository as unknown as InstitutionsRepository,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    repository.findById.mockResolvedValue(institution);
    repository.findByName.mockResolvedValue(null);
    repository.findCountry.mockResolvedValue({ id: countryId });
    repository.countPeople.mockResolvedValue(0);
    repository.create.mockResolvedValue(institution);
    repository.update.mockResolvedValue(institution);
  });
  it('creates an institution linked to a registered country', async () => {
    const dto = {
      name: institution.name,
      acronym: institution.acronym,
      countryId,
    };
    await expect(service.create(dto)).resolves.toEqual(institution);
    expect(repository.findCountry).toHaveBeenCalledWith(countryId);
    expect(repository.create).toHaveBeenCalledWith(dto);
  });
  it('rejects duplicate names, including archived institutions', async () => {
    repository.findByName.mockResolvedValue({ id: 'archived' });
    await expect(service.create(institution)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('requires a country that exists instead of trusting a well-formed UUID', async () => {
    repository.findCountry.mockResolvedValue(null);
    await expect(service.create(institution)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.update(id, { countryId })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });
  it('edits by ID and checks uniqueness excluding the institution being edited', async () => {
    await service.update(id, { name: institution.name });
    expect(repository.findByName).toHaveBeenCalledWith(institution.name, id);
    expect(repository.update).toHaveBeenCalledWith(id, {
      name: institution.name,
    });
    expect(repository.findCountry).not.toHaveBeenCalled();
  });
  it('does not update or delete a missing or archived institution', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findOneById(id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.update(id, { acronym: 'UPR' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(id, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });
  it('returns conflicts for a concurrent unique constraint failure', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });
    repository.create.mockRejectedValue(error);
    await expect(service.create(institution)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('prevents institution deletion by administrators', async () => {
    await expect(
      service.remove(id, { ...actor, role: Role.ADMIN }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.remove).not.toHaveBeenCalled();
  });
  it('preserves an institution and its existing person links when deletion is requested', async () => {
    repository.countPeople.mockResolvedValue(1);
    await expect(service.remove(id, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });
  it('soft-deletes an unreferenced institution and records the actor', async () => {
    await expect(service.remove(id, actor)).resolves.toBeUndefined();
    expect(repository.remove).toHaveBeenCalledWith(id, actor.id);
  });
});

describe('Institutions persistence and catalogs', () => {
  const database = {
    institution: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    person: { count: jest.fn() },
  };
  const repository = new InstitutionsRepository(
    database as unknown as PrismaService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    database.institution.findMany.mockResolvedValue([institution]);
    database.institution.count.mockResolvedValue(31);
  });
  it('preserves the complete existing selector catalog and excludes soft-deleted entries', async () => {
    await repository.findAll();
    const [args] = database.institution.findMany.mock.calls[0] as [
      Prisma.InstitutionFindManyArgs,
    ];
    expect(args.where).toEqual({ deletedAt: null });
    expect(args).not.toHaveProperty('take');
    expect(args).not.toHaveProperty('skip');
    expect(args.include).toEqual({ country: true });
  });
  it('applies the same country and name/acronym filters to rows and totals', async () => {
    await expect(
      repository.findPage({ page: 2, limit: 15, countryId, search: 'UP' }),
    ).resolves.toMatchObject({ page: 2, limit: 15, total: 31 });
    const [args] = database.institution.findMany.mock.calls[0] as [
      Prisma.InstitutionFindManyArgs,
    ];
    expect(args).toMatchObject({
      skip: 15,
      take: 15,
      where: {
        deletedAt: null,
        countryId,
        OR: [
          { name: { contains: 'UP', mode: 'insensitive' } },
          { acronym: { contains: 'UP', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    expect(database.institution.count).toHaveBeenCalledWith({
      where: args.where,
    });
  });
  it('does not serve or edit archived institutions', async () => {
    await repository.findById(id);
    await repository.update(id, { acronym: 'UPR' });
    expect(database.institution.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, deletedAt: null } }),
    );
    expect(database.institution.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, deletedAt: null } }),
    );
  });
  it('archives instead of removing the row or its relationships', async () => {
    await repository.remove(id, actor.id);
    expect(database.institution.update).toHaveBeenCalledWith({
      where: { id, deletedAt: null },
      data: { deletedAt: expect.any(Date) as Date, deletedById: actor.id },
    });
    await repository.countPeople(id);
    expect(database.person.count).toHaveBeenCalledWith({
      where: { institutionId: id, deletedAt: null },
    });
  });
});

describe('Institution controller permissions', () => {
  it('requires authentication and administrative access for the whole CRUD', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      InstitutionsController,
    ) as unknown[];
    expect(guards).toEqual([JwtAuthGuard, AdminGuard]);
    const guard = new JwtAuthGuard(new Reflector());
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'DELETE', url: `/institutions/${id}` }),
      }),
    } as ExecutionContext;
    expect(() =>
      guard.handleRequest(null, { ...actor, role: Role.ADMIN }, null, context),
    ).toThrow(ForbiddenException);
    expect(() => guard.handleRequest(null, false, null, context)).toThrow(
      UnauthorizedException,
    );
    expect(guard.handleRequest(null, actor, null, context)).toEqual(actor);
  });
});
