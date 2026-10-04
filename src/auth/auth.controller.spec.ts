import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthController } from './auth.controller';

const handler = (name: string): object =>
  Object.getOwnPropertyDescriptor(AuthController.prototype, name)
    ?.value as object;

describe('AuthController session routes', () => {
  it('allows refresh without an unexpired access token while the service validates the refresh token', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler('refresh'))).toBe(true);
  });
  it('still requires JWT authentication to get the profile or log out', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AuthController)).toContain(
      JwtAuthGuard,
    );
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler('me'))).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler('logout'))).not.toBe(
      true,
    );
  });
});
