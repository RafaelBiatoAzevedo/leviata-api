import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './DTOs/create-user.dto';
import { UpdateUserDto } from './DTOs/update-user.dto';
import { UpdateAccountDto } from './DTOs/update-account.dto';
import { UsersQueryDto } from './DTOs/user-query.dto';
import { SuperAdminGuard } from './super-admin.guard';
import { UsersController } from './users.controller';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const context = (role?: Role) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  }) as ExecutionContext;

describe('Users permissions and input validation', () => {
  it('requires authentication for all user endpoints', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, UsersController)).toContain(
      JwtAuthGuard,
    );
  });
  it.each(['create', 'findAll', 'findPage', 'findOne', 'update', 'remove'])(
    'limits %s to superadministrators',
    (method) => {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          UsersController.prototype[method] as object,
        ),
      ).toContain(SuperAdminGuard);
    },
  );
  it('allows superadministrators and rejects administrators or anonymous requests', () => {
    const guard = new SuperAdminGuard();
    expect(guard.canActivate(context(Role.SUPER_ADMIN))).toBe(true);
    expect(() => guard.canActivate(context(Role.ADMIN))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
  });
  it('rejects privilege or internal-field changes through the personal account endpoint', async () => {
    for (const key of [
      'role',
      'isActive',
      'tokenVersion',
      'hashedRefreshToken',
      'id',
      'deletedAt',
    ]) {
      await expect(
        pipe.transform(
          { [key]: key === 'role' ? Role.SUPER_ADMIN : 'value' },
          { type: 'body', metatype: UpdateAccountDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });
  it('normalizes email and rejects malformed account data', async () => {
    const dto: unknown = await pipe.transform(
      { email: ' ADMIN@EXAMPLE.COM ', password: 'Password123!' },
      { type: 'body', metatype: CreateUserDto },
    );
    expect(dto).toMatchObject({ email: 'admin@example.com' });
    await expect(
      pipe.transform(
        { email: 'bad', password: '123' },
        { type: 'body', metatype: CreateUserDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each(['role', 'isActive', 'password', 'email'])(
    'rejects null %s during updates',
    async (key) => {
      await expect(
        pipe.transform(
          { [key]: null },
          { type: 'body', metatype: UpdateUserDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
  it('rejects invalid pagination and access-level filters', async () => {
    await expect(
      pipe.transform(
        { page: '0', limit: '101', role: 'OWNER' },
        { type: 'query', metatype: UsersQueryDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
