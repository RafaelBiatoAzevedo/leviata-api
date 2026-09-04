import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PresentedWorksController } from './presented-works.controller';
import { PresentedWorksService } from './presented-works.service';
import { PresentedWorksRepository } from './presented-works.repository';

@Module({
  imports: [PrismaModule],
  controllers: [PresentedWorksController],
  providers: [PresentedWorksService, PresentedWorksRepository],
})
export class PresentedWorksModule {}
