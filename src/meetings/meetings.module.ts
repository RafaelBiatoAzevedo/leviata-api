import { Module } from '@nestjs/common';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { MeetingsRepository } from './meetings.repository';

@Module({
  imports: [PrismaModule, UploadModule, CloudinaryModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsRepository],
})
export class MeetingsModule {}
