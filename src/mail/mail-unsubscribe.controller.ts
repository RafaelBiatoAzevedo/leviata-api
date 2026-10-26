import {
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { MailUnsubscribeService } from './mail-unsubscribe.service';
import { MailTokenDto } from './mail.dto';
import { escapeHtml } from './mail.template';

@ApiTags('Mail')
@Controller('mail/unsubscribe')
@UseGuards(JwtAuthGuard)
export class MailUnsubscribeController {
  constructor(private readonly unsubscribe: MailUnsubscribeService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @ApiExcludeEndpoint()
  confirm(@Query() dto: MailTokenDto) {
    this.unsubscribe.verify(dto.token);
    // GET is intentionally read-only: email scanners must not cancel consent.
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cancelar inscrição</title></head><body style="font:16px/1.7 Arial,sans-serif;background:#fcfaf5;color:#222;padding:24px"><main style="max-width:520px;margin:48px auto;padding:28px;border:1px solid #c6a15b"><h1>Leviatã e o Cativeiro</h1><p>Deseja deixar de receber nossas newsletters por e-mail?</p><form method="post" action="?token=${escapeHtml(encodeURIComponent(dto.token))}"><button style="padding:12px 20px;background:#c6a15b;border:0;border-radius:6px;font:inherit;cursor:pointer">Cancelar inscrição por e-mail</button></form></main></body></html>`;
  }

  @Public()
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Unsubscribe using the signed link; supports List-Unsubscribe one-click POST',
  })
  remove(@Query() dto: MailTokenDto) {
    return this.unsubscribe.unsubscribe(dto.token);
  }
}
