import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { Role } from '@prisma/client';
import type { IUserJwt } from './jwt.strategy';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = IUserJwt>(
    error: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const authenticated = super.handleRequest<TUser>(
      error,
      user,
      info,
      context,
    );
    const request = context.switchToHttp().getRequest<{ method: string }>();
    if (
      request.method === 'DELETE' &&
      (authenticated as IUserJwt).role === Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Administradores não podem excluir registros ou arquivos. Esta ação exige um superadministrador.',
      );
    }
    return authenticated;
  }
}
