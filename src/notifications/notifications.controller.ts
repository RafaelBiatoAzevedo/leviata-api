import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IUserJwt } from '../auth/jwt.strategy';
import { AdminGuard } from '../common/guards/admin.guard';
import {
  CreateNotificationDto,
  NotificationsQueryDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('counts')
  @ApiOperation({
    summary:
      'Unread count for the current administrator and pending moderation count',
  })
  counts(@Req() req: { user: IUserJwt }) {
    return this.service.counts(req.user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'List visible administrative notifications with per-user read state',
  })
  findAll(
    @Query() query: NotificationsQueryDto,
    @Req() req: { user: IUserJwt },
  ) {
    return this.service.findAll(query, req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an administrative announcement or scheduled reminder',
  })
  create(@Body() dto: CreateNotificationDto, @Req() req: { user: IUserJwt }) {
    return this.service.create(dto, req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: { user: IUserJwt }) {
    return this.service.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: IUserJwt },
  ) {
    return this.service.markRead(id, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: IUserJwt },
  ) {
    return this.service.findOne(id, req.user.id);
  }
}
