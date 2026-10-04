import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy account state', () => {
  const findFirst = jest.fn();
  let strategy: JwtStrategy;
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    strategy = new JwtStrategy({
      user: { findFirst },
    } as unknown as PrismaService);
    jest.resetAllMocks();
  });
  const payload = {
    sub: 'user-id',
    email: 'old@example.com',
    role: Role.SUPER_ADMIN,
    version: 0,
  };
  it('checks current roles in the database instead of trusting old token claims', async () => {
    findFirst.mockResolvedValue({
      id: 'user-id',
      email: 'current@example.com',
      role: Role.ADMIN,
      firstName: 'Ana',
      lastName: null,
      tokenVersion: 0,
    });
    expect(await strategy.validate(payload)).toMatchObject({
      role: Role.ADMIN,
      email: 'current@example.com',
      firstName: 'Ana',
    });
    const [args] = findFirst.mock.calls[0] as [{ where: unknown }];
    expect(args.where).toEqual({
      id: 'user-id',
      isActive: true,
      deletedAt: null,
    });
  });
  it('rejects deleted or inactive accounts', async () => {
    findFirst.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
  it('rejects tokens issued before a password, permission or session change', async () => {
    findFirst.mockResolvedValue({
      id: 'user-id',
      role: Role.ADMIN,
      tokenVersion: 1,
    });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
  it('accepts legacy tokens only for unchanged accounts at version zero', async () => {
    findFirst.mockResolvedValue({
      id: 'user-id',
      role: Role.ADMIN,
      tokenVersion: 0,
    });
    await expect(
      strategy.validate({ ...payload, version: undefined }),
    ).resolves.toMatchObject({ id: 'user-id' });
    findFirst.mockResolvedValue({
      id: 'user-id',
      role: Role.ADMIN,
      tokenVersion: 1,
    });
    await expect(
      strategy.validate({ ...payload, version: undefined }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
