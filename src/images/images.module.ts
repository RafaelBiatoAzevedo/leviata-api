import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ImagesService } from './images.service';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
