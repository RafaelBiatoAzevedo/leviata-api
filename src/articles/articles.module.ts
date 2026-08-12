import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { ArticlesRepository } from './articles.repository';

@Module({
  imports: [PrismaModule, UploadModule, CloudinaryModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticlesRepository],
})
export class ArticlesModule {}
