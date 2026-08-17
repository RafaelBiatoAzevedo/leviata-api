import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { UploadModule } from 'src/upload/upload.module';
import { NewsRepository } from './news.repository';

@Module({
  imports: [PrismaModule, UploadModule, CloudinaryModule],
  controllers: [NewsController],
  providers: [NewsService, NewsRepository],
})
export class NewsModule {}
