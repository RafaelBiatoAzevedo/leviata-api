import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MailConfig } from './mail.config';
import { MailService } from './mail.service';
import { MailNewslettersService } from './mail-newsletters.service';
import { MailUnsubscribeService } from './mail-unsubscribe.service';
import { MailWorker } from './mail.worker';
import { MailController } from './mail.controller';
import { MailUnsubscribeController } from './mail-unsubscribe.controller';
import { NewsletterPdfModule } from '../newsletter/pdf/newsletter-pdf.module';

@Module({
  imports: [ConfigModule, PrismaModule, NewsletterPdfModule],
  controllers: [MailController, MailUnsubscribeController],
  providers: [
    MailConfig,
    MailService,
    MailNewslettersService,
    MailUnsubscribeService,
    MailWorker,
  ],
  exports: [MailService],
})
export class MailModule {}
