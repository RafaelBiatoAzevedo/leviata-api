import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminActivityService } from './admin-activity.service';
import { AdminActivityInterceptor } from './admin-activity.interceptor';
import { AdminActivityController } from './admin-activity.controller';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [AdminActivityController],
  providers: [
    AdminActivityService,
    { provide: APP_INTERCEPTOR, useClass: AdminActivityInterceptor },
  ],
})
export class AdminActivityModule {}
