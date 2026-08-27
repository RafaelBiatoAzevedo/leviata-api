import { Module } from '@nestjs/common';
import { JurisController } from './juris.controller';
import { JurisService } from './juris.service';
import { JurisRepository } from './juris.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, UploadModule, CloudinaryModule],
  controllers: [JurisController],
  providers: [JurisService, JurisRepository],
})
export class JurisModule {}
