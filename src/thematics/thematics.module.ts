import { Module } from '@nestjs/common';
import { ThematicsController } from './thematics.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ThematicsRepository } from './thematics.repository';
import { ThematicsService } from './thematics.service';

@Module({
  imports: [PrismaModule],
  controllers: [ThematicsController],
  providers: [ThematicsService, ThematicsRepository],
})
export class ThematicsModule {}
