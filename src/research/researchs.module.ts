import { ImagesModule } from '../images/images.module';
import { ResearchImagesController } from './researchs-images.controller';
import { Module } from '@nestjs/common';
import { ResearchService } from './researchs.service';
import { ResearchController } from './researchs.controller';
import { ResearchRepository } from './researchs.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [ImagesModule, PrismaModule, UploadModule, CloudinaryModule],
  controllers: [ResearchImagesController, ResearchController],
  providers: [ResearchService, ResearchRepository],
})
export class ResearchModule {}
