import { ImagesModule } from '../images/images.module';
import { JuriesImagesController } from './juries-images.controller';
import { Module } from '@nestjs/common';
import { JuriesController } from './juries.controller';
import { JuriesService } from './juries.service';
import { JuriesRepository } from './juries.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [ImagesModule, PrismaModule, UploadModule, CloudinaryModule],
  controllers: [JuriesImagesController, JuriesController],
  providers: [JuriesService, JuriesRepository],
})
export class JuriesModule {}
