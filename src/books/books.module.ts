import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { BooksRepository } from './books.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, UploadModule, CloudinaryModule],
  controllers: [BooksController],
  providers: [BooksService, BooksRepository],
})
export class BooksModule {}
