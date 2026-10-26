import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isEmail, isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { MailConfig } from './mail.config';

@Injectable()
export class MailUnsubscribeService {
  constructor(
    private readonly config: MailConfig,
    private readonly prisma: PrismaService,
  ) {}

  private secret() {
    const secret = this.config.settings().unsubscribeSecret;
    if (Buffer.byteLength(secret) < 32)
      throw new ServiceUnavailableException(
        'O descadastro por e-mail ainda não foi configurado.',
      );
    return secret;
  }

  link(subscriber: { id: string; email: string }) {
    const payload = Buffer.from(
      JSON.stringify({ id: subscriber.id, email: subscriber.email }),
    ).toString('base64url');
    const signature = createHmac('sha256', this.secret())
      .update(payload)
      .digest('base64url');
    return `${this.config.settings().apiUrl}/mail/unsubscribe?token=${payload}.${signature}`;
  }

  verify(token: string) {
    const secret = this.secret();
    try {
      const parts = token.split('.');
      if (parts.length !== 2) throw new Error();
      const [payload, signature] = parts;
      const expected = createHmac('sha256', secret).update(payload).digest();
      const provided = Buffer.from(signature, 'base64url');
      if (
        provided.length !== expected.length ||
        !timingSafeEqual(provided, expected)
      )
        throw new Error();
      const decoded: unknown = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      );
      if (!decoded || typeof decoded !== 'object') throw new Error();
      const data = decoded as Record<string, unknown>;
      if (
        typeof data.id !== 'string' ||
        !isUUID(data.id) ||
        typeof data.email !== 'string' ||
        !isEmail(data.email)
      )
        throw new Error();
      return { id: data.id, email: data.email };
    } catch {
      throw new BadRequestException('Link de descadastro inválido.');
    }
  }

  async unsubscribe(token: string) {
    const subscriber = this.verify(token);
    await this.prisma.newsletterSubscriber.updateMany({
      where: { ...subscriber, deletedAt: null, allowEmail: true },
      data: { allowEmail: false, unsubscribedAt: new Date() },
    });
    return {
      message:
        'Inscrição por e-mail cancelada. Você pode se inscrever novamente pelo portal.',
    };
  }
}
