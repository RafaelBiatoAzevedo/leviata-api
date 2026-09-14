import { Module } from '@nestjs/common';
import { ResearchInstrumentsController } from './researchInstruments.controller';
import { ResearchInstrumentsService } from './researchInstruments.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResearchInstrumentsRepository } from './researchInstruments.repository';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule, CloudinaryModule],
  controllers: [ResearchInstrumentsController],
  providers: [ResearchInstrumentsService, ResearchInstrumentsRepository],
})
export class ResearchInstrumentsModule {}
