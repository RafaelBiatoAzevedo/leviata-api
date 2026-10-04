import { PrismaService } from '../prisma/prisma.service';
import { AuthRepository } from './auth.repository';

describe('AuthRepository session state', () => {
  const user = { findFirst: jest.fn(), update: jest.fn() };
  const repository = new AuthRepository({ user } as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it('excludes deleted accounts and normalizes login emails', async () => {
    await repository.findUserByEmail(' USER@EXAMPLE.COM ');
    expect(user.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'user@example.com', mode: 'insensitive' },
        deletedAt: null,
      },
    });
  });
  it('revokes access tokens as well as refresh tokens on logout', async () => {
    await repository.clearRefreshToken('user-id');
    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { hashedRefreshToken: null, tokenVersion: { increment: 1 } },
    });
  });
});
