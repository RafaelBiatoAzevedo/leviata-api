import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { UploadModule } from 'src/upload/upload.module';
import { NewsRepository } from './news.repository';
import { ImagesModule } from '../images/images.module';
import { NewsImagesController } from './news-images.controller';

@Module({
  imports: [PrismaModule, UploadModule, CloudinaryModule, ImagesModule],
  controllers: [NewsImagesController, NewsController],
  providers: [NewsService, NewsRepository],
})
export class NewsModule {}
