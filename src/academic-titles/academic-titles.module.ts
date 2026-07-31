import { Module } from '@nestjs/common';
import { AcademicTitlesController } from './academic-titles.controller';
import { AcademicTitlesService } from './academic-titles.service';
import { AcademicTitlesRepository } from './academic-titles.repository';

@Module({
  controllers: [AcademicTitlesController],
  providers: [AcademicTitlesService, AcademicTitlesRepository],
})
export class AcademicTitlesModule {}
