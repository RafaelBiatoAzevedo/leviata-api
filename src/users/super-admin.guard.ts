import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { IUserJwt } from '../auth/jwt.strategy';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { user } = context.switchToHttp().getRequest<{ user?: IUserJwt }>();
    if (user?.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Somente superadministradores podem gerenciar usuários.',
      );
    }
    return true;
  }
}
