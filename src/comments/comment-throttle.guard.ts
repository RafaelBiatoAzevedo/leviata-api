import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CommentThrottleGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { count: number; expires: number }
  >();

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const now = Date.now();
    for (const [ip, item] of this.attempts) {
      if (item.expires <= now) this.attempts.delete(ip);
    }
    const item = this.attempts.get(key) ?? { count: 0, expires: now + 60_000 };
    if (
      item.count >= 5 ||
      (!this.attempts.has(key) && this.attempts.size >= 10000)
    ) {
      const response = context
        .switchToHttp()
        .getResponse<{ setHeader(name: string, value: string): void }>();
      response.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil((item.expires - now) / 1000))),
      );
      throw new HttpException(
        'Aguarde um minuto antes de enviar outro comentário.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    item.count += 1;
    this.attempts.set(key, item);
    return true;
  }
}
