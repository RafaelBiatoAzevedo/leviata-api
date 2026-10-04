import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { listPage } from '../common/utils/list-page';
import { UsersQueryDto } from './DTOs/user-query.dto';

const userSelection = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(action: (client: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(action, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  findById(id: string, client: Prisma.TransactionClient = this.prisma) {
    return client.user.findFirst({
      where: { id, deletedAt: null },
      select: userSelection,
    });
  }

  findCredentials(id: string, client: Prisma.TransactionClient) {
    return client.user.findFirst({
      where: { id, deletedAt: null },
      select: { ...userSelection, password: true },
    });
  }

  findByEmail(
    email: string,
    ignoreId?: string,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    return client.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        ...(ignoreId && { NOT: { id: ignoreId } }),
      },
      select: { id: true },
    });
  }

  countSuperAdmins(client: Prisma.TransactionClient) {
    return client.user.count({
      where: { deletedAt: null, isActive: true, role: Role.SUPER_ADMIN },
    });
  }

  private listArgs(query: UsersQueryDto) {
    const {
      page = 1,
      limit = 15,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    return {
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
      },
      orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: userSelection,
    } satisfies Prisma.UserFindManyArgs;
  }

  findAll(query: UsersQueryDto) {
    return this.prisma.user.findMany(this.listArgs(query));
  }

  findPage(query: UsersQueryDto) {
    const args = this.listArgs(query);
    return listPage(
      { page: query.page ?? 1, limit: query.limit ?? 15 },
      this.prisma.user.findMany(args),
      this.prisma.user.count({ where: args.where }),
    );
  }

  create(data: Prisma.UserCreateInput, client: Prisma.TransactionClient) {
    return client.user.create({ data, select: userSelection });
  }

  update(
    id: string,
    data: Prisma.UserUpdateInput,
    client: Prisma.TransactionClient,
  ) {
    return client.user.update({ where: { id }, data, select: userSelection });
  }
}
