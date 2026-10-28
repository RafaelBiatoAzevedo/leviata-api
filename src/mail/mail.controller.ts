import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IUserJwt } from '../auth/jwt.strategy';
import { AdminGuard } from '../common/guards/admin.guard';
import { MailConfig } from './mail.config';
import { MailService } from './mail.service';
import { MailNewslettersService } from './mail-newsletters.service';
import {
  MailAudienceQueryDto,
  MailDeliveriesQueryDto,
  MailSendDto,
  MailTestDto,
} from './mail.dto';
import { MailWorker } from './mail.worker';

@ApiTags('Mail')
@ApiBearerAuth()
@Controller('mail')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MailController {
  constructor(
    private readonly config: MailConfig,
    private readonly mail: MailService,
    private readonly newsletters: MailNewslettersService,
    private readonly worker: MailWorker,
  ) {}

  @Get('status')
  @ApiOperation({
    summary:
      'Mail readiness and missing environment variable names; never returns credentials',
  })
  status() {
    return { ...this.config.status(), worker: this.worker.state() };
  }

  @Post('verify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify SMTP authentication without sending an email',
  })
  async verify() {
    const result = await this.mail.verify();
    this.worker.resume();
    return result;
  }

  @Post('newsletters/:id/test')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Send one preview to an explicitly selected recipient; does not start a campaign',
  })
  test(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MailTestDto) {
    return this.newsletters.test(id, dto.to);
  }

  @Post('newsletters/:id/send')
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Queue a published newsletter for all or selected eligible subscribers; repeated requests reuse the campaign',
  })
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user: IUserJwt },
    @Body() dto: MailSendDto,
  ) {
    return this.newsletters.enqueue(id, request.user.id, dto);
  }

  @Get('newsletters/:id/status')
  @ApiOperation({ summary: 'Campaign progress and delivery counts' })
  campaignStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsletters.status(id);
  }

  @Get('newsletters/:id/deliveries')
  @ApiOperation({ summary: 'Paginated delivery history for administrators' })
  deliveries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MailDeliveriesQueryDto,
  ) {
    return this.newsletters.deliveries(id, query);
  }

  @Get('newsletters/:id/audience')
  @ApiOperation({
    summary:
      'Preview registered and eligible subscribers without exposing addresses',
  })
  audience(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsletters.audience(id);
  }

  @Get('newsletters/:id/subscribers')
  @ApiOperation({
    summary:
      'List eligible subscribers by name or email for admin recipient selection',
  })
  subscribers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MailAudienceQueryDto,
  ) {
    return this.newsletters.subscribers(id, query);
  }

  @Get('newsletters/:id/delivery-records')
  @ApiOperation({
    summary:
      'Paginated successful NewsletterDelivery records, including historical sends',
  })
  deliveryRecords(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MailDeliveriesQueryDto,
  ) {
    return this.newsletters.deliveryRecords(id, query);
  }

  @Post('newsletters/:id/retry')
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Retry failed deliveries only; sent and ambiguous deliveries are never automatically repeated',
  })
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsletters.retry(id);
  }

  @Post('newsletters/:id/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Cancel pending deliveries; a message already being accepted by SMTP may finish',
  })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsletters.cancel(id);
  }
}
