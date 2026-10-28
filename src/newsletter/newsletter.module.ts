import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { NewsletterRepository } from './newsletter.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UploadModule } from '../upload/upload.module';
import { NewsletterPdfModule } from './pdf/newsletter-pdf.module';

@Module({
  imports: [PrismaModule, CloudinaryModule, UploadModule, NewsletterPdfModule],
  controllers: [NewsletterController],
  providers: [NewsletterService, NewsletterRepository],
})
export class NewsletterModule {}
