import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UserResponseDto } from './DTOs/user-response.dto';

const actor = {
  id: 'actor',
  email: 'owner@example.com',
  role: Role.SUPER_ADMIN,
};
const account: UserResponseDto = {
  id: 'target',
  email: 'user@example.com',
  firstName: 'Maria',
  lastName: null,
  role: Role.ADMIN,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const client = {} as Prisma.TransactionClient;

describe('UsersService account management', () => {
  const repository = {
    transaction: <T>(
      action: (client: Prisma.TransactionClient) => Promise<T>,
    ) => action(client),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findCredentials: jest.fn(),
    countSuperAdmins: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const service = new UsersService(repository as unknown as UsersRepository);
  let originalPassword: string;
  beforeAll(async () => {
    originalPassword = await bcrypt.hash('Original123!', 4);
  });
  beforeEach(() => {
    jest.resetAllMocks();
    repository.findById.mockResolvedValue(account);
    repository.findCredentials.mockResolvedValue({
      ...account,
      password: originalPassword,
    });
    repository.findByEmail.mockResolvedValue(null);
    repository.countSuperAdmins.mockResolvedValue(2);
    repository.create.mockResolvedValue(account);
    repository.update.mockResolvedValue(account);
  });

  it('normalizes emails and stores a hash instead of the submitted password', async () => {
    const result = await service.create({
      email: ' USER@Example.com ',
      password: 'Password123!',
    });
    const [data] = repository.create.mock.calls[0] as [Prisma.UserCreateInput];
    expect(data.email).toBe('user@example.com');
    expect(data.password).not.toBe('Password123!');
    expect(await bcrypt.compare('Password123!', data.password)).toBe(true);
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('hashedRefreshToken');
  });

  it('rejects an email already registered, including deleted accounts', async () => {
    repository.findByEmail.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create({ email: 'user@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects UTF-8 passwords that bcrypt would silently truncate', async () => {
    await expect(
      service.create({ email: account.email, password: 'é'.repeat(40) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([{ isActive: false }, { role: Role.ADMIN }])(
    'prevents disabling or demoting the authenticated account',
    async (changes) => {
      repository.findById.mockResolvedValue({
        ...account,
        id: actor.id,
        role: Role.SUPER_ADMIN,
      });
      await expect(
        service.update(actor.id, changes, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    },
  );

  it('prevents deleting the authenticated account', async () => {
    repository.findById.mockResolvedValue({
      ...account,
      id: actor.id,
      role: Role.SUPER_ADMIN,
    });
    await expect(service.remove(actor.id, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([{ isActive: false }, { role: Role.ADMIN }])(
    'preserves the last active superadministrator',
    async (changes) => {
      repository.findById.mockResolvedValue({
        ...account,
        role: Role.SUPER_ADMIN,
      });
      repository.countSuperAdmins.mockResolvedValue(1);
      await expect(
        service.update(account.id, changes, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    },
  );

  it('revokes tokens when access is disabled', async () => {
    await service.update(account.id, { isActive: false }, actor);
    const [, data] = repository.update.mock.calls[0] as [
      string,
      Prisma.UserUpdateInput,
    ];
    expect(data).toMatchObject({
      isActive: false,
      tokenVersion: { increment: 1 },
      hashedRefreshToken: null,
    });
  });

  it('soft-deletes the account with its actor and revokes all sessions', async () => {
    await service.remove(account.id, actor);
    const [, data] = repository.update.mock.calls[0] as [
      string,
      Prisma.UserUpdateInput,
    ];
    expect(data).toMatchObject({
      deletedById: actor.id,
      deletedAt: expect.any(Date) as Date,
      isActive: false,
      tokenVersion: { increment: 1 },
      hashedRefreshToken: null,
    });
  });

  it('requires the current password to change own email or password', async () => {
    await expect(
      service.updateAccount(account.id, { email: 'new@example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateAccount(account.id, {
        email: 'new@example.com',
        currentPassword: 'WrongPassword',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('changes own password and revokes prior tokens after verifying the old password', async () => {
    await service.updateAccount(account.id, {
      password: 'Changed123!',
      currentPassword: 'Original123!',
    });
    const [, data] = repository.update.mock.calls[0] as [
      string,
      Prisma.UserUpdateInput,
    ];
    expect(await bcrypt.compare('Changed123!', data.password as string)).toBe(
      true,
    );
    expect(data).toMatchObject({
      tokenVersion: { increment: 1 },
      hashedRefreshToken: null,
    });
    expect(data).not.toHaveProperty('currentPassword');
  });

  it('updates profile names without resetting the session', async () => {
    await service.updateAccount(account.id, {
      firstName: 'Ana',
      lastName: null,
    });
    const [, data] = repository.update.mock.calls[0] as [
      string,
      Prisma.UserUpdateInput,
    ];
    expect(data).toEqual({ firstName: 'Ana', lastName: null });
  });

  it('does not update or delete missing accounts', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.update('missing', {}, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove('missing', actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
