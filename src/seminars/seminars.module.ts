import { Module } from '@nestjs/common';
import { SeminarsController } from './seminars.controller';
import { SeminarsService } from './seminars.service';

@Module({
  controllers: [SeminarsController],
  providers: [SeminarsService]
})
export class SeminarsModule {}
