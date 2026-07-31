import { Module } from '@nestjs/common';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import { InstitutionsRepository } from './institutions.repository';

@Module({
  controllers: [InstitutionsController],
  providers: [InstitutionsService, InstitutionsRepository],
})
export class InstitutionsModule {}
