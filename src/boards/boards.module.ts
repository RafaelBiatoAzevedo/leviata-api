import { ImagesModule } from '../images/images.module';
import { BoardsImagesController } from './boards-images.controller';
import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BoardsRepository } from './boards.repository';

@Module({
  imports: [ImagesModule, PrismaModule],
  controllers: [BoardsImagesController, BoardsController],
  providers: [BoardsService, BoardsRepository],
})
export class BoardsModule {}
