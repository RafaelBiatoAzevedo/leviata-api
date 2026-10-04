import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtPayload } from './jwt.strategy';

const jwt = new JwtService({
  secret: 'access-secret',
  signOptions: { expiresIn: '1h' },
});
const config = new ConfigService({ JWT_REFRESH_SECRET: 'refresh-secret' });

describe('AuthService account sessions', () => {
  const repository = {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    updateRefreshToken: jest.fn(),
    clearRefreshToken: jest.fn(),
  };
  const service = new AuthService(
    repository as unknown as AuthRepository,
    jwt,
    config,
  );
  let user: User;
  beforeAll(async () => {
    user = {
      id: 'user-id',
      email: 'user@example.com',
      firstName: 'Ana',
      lastName: null,
      role: Role.ADMIN,
      isActive: true,
      password: await bcrypt.hash('Password123!', 4),
      hashedRefreshToken: null,
      tokenVersion: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      deletedById: null,
    };
  });
  beforeEach(() => {
    jest.resetAllMocks();
    repository.findUserByEmail.mockResolvedValue(user);
  });

  it('issues versioned tokens and returns no hashes to the frontend', async () => {
    const response = await service.login({
      email: user.email,
      password: 'Password123!',
    });
    const access = jwt.verify<JwtPayload>(response.accessToken);
    const refresh = jwt.verify<JwtPayload>(response.refreshToken, {
      secret: 'refresh-secret',
    });
    expect(access.version).toBe(3);
    expect(refresh.version).toBe(3);
    expect(response.user).not.toHaveProperty('password');
    expect(response.user).not.toHaveProperty('hashedRefreshToken');
  });

  it('rejects inactive accounts even with the correct password', async () => {
    repository.findUserByEmail.mockResolvedValue({ ...user, isActive: false });
    await expect(
      service.login({ email: user.email, password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a refresh token revoked by account management', async () => {
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, version: 2 },
      { secret: 'refresh-secret' },
    );
    repository.findUserById.mockResolvedValue({
      ...user,
      hashedRefreshToken: await bcrypt.hash(token, 4),
    });
    await expect(
      service.refresh({ refreshToken: token }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('looks up the immutable account id when rotating valid refresh tokens', async () => {
    const token = jwt.sign(
      { sub: user.id, email: 'old@example.com', role: user.role, version: 3 },
      { secret: 'refresh-secret' },
    );
    repository.findUserById.mockResolvedValue({
      ...user,
      hashedRefreshToken: await bcrypt.hash(token, 4),
    });
    const response = await service.refresh({ refreshToken: token });
    expect(repository.findUserById).toHaveBeenCalledWith(user.id);
    expect(jwt.verify<JwtPayload>(response.accessToken)).toMatchObject({
      sub: user.id,
      email: user.email,
      version: 3,
    });
    expect(response.refreshToken).toBeTruthy();
  });
});
