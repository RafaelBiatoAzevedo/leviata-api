import { Module } from '@nestjs/common';
import { ResearchService } from './researchs.service';
import { ResearchController } from './researchs.controller';
import { ResearchRepository } from './researchs.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, UploadModule, CloudinaryModule],
  controllers: [ResearchController],
  providers: [ResearchService, ResearchRepository],
})
export class ResearchModule {}
