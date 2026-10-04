import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  const user = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const transaction = jest.fn();
  const prisma = {
    user,
    $transaction: transaction,
  } as unknown as PrismaService;
  const repository = new UsersRepository(prisma);
  beforeEach(() => jest.resetAllMocks());

  it('uses the same filters for records and the total, without returning secrets', async () => {
    user.findMany.mockResolvedValue([]);
    user.count.mockResolvedValue(241);
    const result = await repository.findPage({
      page: 2,
      limit: 15,
      role: Role.ADMIN,
      isActive: 'false',
      search: 'maria',
    });
    const [args] = user.findMany.mock.calls[0] as [Prisma.UserFindManyArgs];
    expect(args.where).toMatchObject({
      deletedAt: null,
      role: Role.ADMIN,
      isActive: false,
    });
    expect(args).toMatchObject({ skip: 15, take: 15 });
    expect(user.count).toHaveBeenCalledWith({ where: args.where });
    expect(args.select).not.toHaveProperty('password');
    expect(args.select).not.toHaveProperty('hashedRefreshToken');
    expect(args.select).not.toHaveProperty('tokenVersion');
    expect(result).toEqual({ items: [], total: 241, page: 2, limit: 15 });
  });

  it('excludes deleted users and secrets from reads and write responses', async () => {
    await repository.findById('user-id');
    await repository.create(
      { email: 'new@example.com', password: 'hash' },
      prisma,
    );
    await repository.update('user-id', { firstName: 'Ana' }, prisma);
    for (const operation of [user.findFirst, user.create, user.update]) {
      const [args] = operation.mock.calls[0] as [{ select: Prisma.UserSelect }];
      expect(args.select).not.toHaveProperty('password');
      expect(args.select).not.toHaveProperty('hashedRefreshToken');
    }
    const [args] = user.findFirst.mock.calls[0] as [Prisma.UserFindFirstArgs];
    expect(args.where).toEqual({ id: 'user-id', deletedAt: null });
  });

  it('serializes account mutations so concurrent changes cannot remove all superadministrators', async () => {
    const action = () => Promise.resolve('saved');
    await repository.transaction(action);
    expect(transaction).toHaveBeenCalledWith(action, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });
});
