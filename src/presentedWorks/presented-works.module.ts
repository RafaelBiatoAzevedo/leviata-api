import { ImagesModule } from '../images/images.module';
import { PresentedWorksImagesController } from './presented-works-images.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PresentedWorksController } from './presented-works.controller';
import { PresentedWorksService } from './presented-works.service';
import { PresentedWorksRepository } from './presented-works.repository';

@Module({
  imports: [ImagesModule, PrismaModule],
  controllers: [PresentedWorksImagesController, PresentedWorksController],
  providers: [PresentedWorksService, PresentedWorksRepository],
})
export class PresentedWorksModule {}
