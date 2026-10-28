import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NewsletterPdfService } from './newsletter-pdf.service';
import { NewsletterDocumentsService } from './newsletter-documents.service';

@Module({
  imports: [PrismaModule],
  providers: [NewsletterPdfService, NewsletterDocumentsService],
  exports: [NewsletterPdfService, NewsletterDocumentsService],
})
export class NewsletterPdfModule {}
