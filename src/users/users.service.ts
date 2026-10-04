import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { IUserJwt } from '../auth/jwt.strategy';
import { CreateUserDto } from './DTOs/create-user.dto';
import { UpdateUserDto } from './DTOs/update-user.dto';
import { UpdateAccountDto } from './DTOs/update-account.dto';
import { UserResponseDto } from './DTOs/user-response.dto';
import { UsersQueryDto } from './DTOs/user-query.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  private async hashPassword(password: string) {
    if (Buffer.byteLength(password, 'utf8') > 72)
      throw new BadRequestException('A senha deve ter no máximo 72 bytes.');
    return bcrypt.hash(password, 10);
  }

  private async transaction<T>(
    action: (client: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      return await this.users.transaction(action);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException('Já existe um usuário com esse e-mail.');
        if (error.code === 'P2034')
          throw new ConflictException(
            'Outro usuário alterou estes dados. Atualize a página e tente novamente.',
          );
      }
      throw error;
    }
  }

  private async ensureEmail(
    email: string,
    client: Prisma.TransactionClient,
    ignoreId?: string,
  ) {
    if (await this.users.findByEmail(email, ignoreId, client))
      throw new ConflictException('Já existe um usuário com esse e-mail.');
  }

  async create(dto: CreateUserDto) {
    const password = await this.hashPassword(dto.password);
    const email = dto.email.trim().toLowerCase();
    return this.transaction(async (client) => {
      await this.ensureEmail(email, client);
      return this.users.create(
        {
          ...dto,
          email,
          password,
          role: dto.role ?? Role.ADMIN,
          isActive: dto.isActive ?? true,
        },
        client,
      );
    });
  }

  findAll(query: UsersQueryDto) {
    return this.users.findAll(query);
  }
  findPage(query: UsersQueryDto) {
    return this.users.findPage(query);
  }

  async findOne(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  private async protectAccount(
    current: UserResponseDto,
    role: Role,
    isActive: boolean,
    actor: IUserJwt,
    client: Prisma.TransactionClient,
  ) {
    if (current.id === actor.id && (!isActive || role !== current.role))
      throw new BadRequestException(
        'Você não pode desativar, excluir ou alterar o nível de acesso da própria conta.',
      );
    if (
      current.role === Role.SUPER_ADMIN &&
      current.isActive &&
      (role !== Role.SUPER_ADMIN || !isActive) &&
      (await this.users.countSuperAdmins(client)) <= 1
    ) {
      throw new BadRequestException(
        'É necessário manter ao menos um superadministrador ativo.',
      );
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: IUserJwt) {
    const password =
      dto.password === undefined
        ? undefined
        : await this.hashPassword(dto.password);
    return this.transaction(async (client) => {
      const current = await this.users.findById(id, client);
      if (!current) throw new NotFoundException('Usuário não encontrado.');
      const role = dto.role ?? current.role;
      const isActive = dto.isActive ?? current.isActive;
      await this.protectAccount(current, role, isActive, actor, client);
      const email = dto.email?.trim().toLowerCase();
      if (email !== undefined) await this.ensureEmail(email, client, id);
      const revoke =
        password !== undefined ||
        (email !== undefined && email !== current.email) ||
        role !== current.role ||
        isActive !== current.isActive;
      return this.users.update(
        id,
        {
          ...dto,
          ...(email !== undefined && { email }),
          ...(password !== undefined && { password }),
          ...(revoke && {
            hashedRefreshToken: null,
            tokenVersion: { increment: 1 },
          }),
        },
        client,
      );
    });
  }

  async remove(id: string, actor: IUserJwt) {
    await this.transaction(async (client) => {
      const current = await this.users.findById(id, client);
      if (!current) throw new NotFoundException('Usuário não encontrado.');
      await this.protectAccount(current, current.role, false, actor, client);
      await this.users.update(
        id,
        {
          deletedAt: new Date(),
          deletedById: actor.id,
          isActive: false,
          hashedRefreshToken: null,
          tokenVersion: { increment: 1 },
        },
        client,
      );
    });
  }

  async updateAccount(id: string, dto: UpdateAccountDto) {
    const password =
      dto.password === undefined
        ? undefined
        : await this.hashPassword(dto.password);
    return this.transaction(async (client) => {
      const current = await this.users.findCredentials(id, client);
      if (!current || !current.isActive)
        throw new UnauthorizedException('Conta indisponível.');
      const email = dto.email?.trim().toLowerCase();
      const revoke =
        password !== undefined ||
        (email !== undefined && email !== current.email);
      if (
        revoke &&
        (!dto.currentPassword ||
          !(await bcrypt.compare(dto.currentPassword, current.password)))
      ) {
        throw new BadRequestException(
          'Informe corretamente a senha atual para alterar e-mail ou senha.',
        );
      }
      if (email !== undefined) await this.ensureEmail(email, client, id);
      return this.users.update(
        id,
        {
          ...(email !== undefined && { email }),
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          ...(password !== undefined && { password }),
          ...(revoke && {
            hashedRefreshToken: null,
            tokenVersion: { increment: 1 },
          }),
        },
        client,
      );
    });
  }
}
