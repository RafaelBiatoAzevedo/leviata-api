import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentThrottleGuard } from './comment-throttle.guard';
import { SuperAdminGuard } from '../users/super-admin.guard';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService, CommentThrottleGuard, SuperAdminGuard],
})
export class CommentsModule {}
