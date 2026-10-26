import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, AdminGuard],
})
export class NotificationsModule {}
