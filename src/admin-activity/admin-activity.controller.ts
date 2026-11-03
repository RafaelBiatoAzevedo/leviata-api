import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../users/super-admin.guard';
import { AdminActivityService } from './admin-activity.service';

@ApiTags('Administrative audit')
@ApiBearerAuth()
@Controller('admin-activity')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminActivityController {
  constructor(private readonly activity: AdminActivityService) {}

  @Get('status')
  status() {
    return this.activity.status();
  }

  @Post('retry')
  retry() {
    return this.activity.retryFailed();
  }
}
