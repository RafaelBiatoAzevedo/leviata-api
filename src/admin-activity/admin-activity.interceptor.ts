import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { catchError, defer, mergeMap, type Observable } from 'rxjs';
import { AdminActivityService } from './admin-activity.service';
import type { ActivityRequest } from './admin-activity.data';

@Injectable()
export class AdminActivityInterceptor implements NestInterceptor {
  constructor(private readonly activity: AdminActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<ActivityRequest>();
    const path = (request.originalUrl ?? request.url).split('?')[0];
    if (
      request.user?.role !== Role.ADMIN ||
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) ||
      path.startsWith('/auth/') ||
      ['/newsletter/preview', '/mail/verify'].includes(path)
    )
      return next.handle();

    // Reserve the audit first: an unavailable audit store must prevent an untracked write.
    return defer(() => this.activity.begin(request)).pipe(
      mergeMap((record) =>
        next.handle().pipe(
          catchError((error: unknown) =>
            defer(async () => {
              await this.activity.failed(record.id);
              throw error;
            }),
          ),
          mergeMap(async (result: unknown) => {
            await this.activity.complete(record.id, request, result);
            return result;
          }),
        ),
      ),
    );
  }
}
