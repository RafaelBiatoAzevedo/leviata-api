import { Module } from '@nestjs/common';
import { JurisController } from './juris.controller';
import { JurisService } from './juris.service';

@Module({
  controllers: [JurisController],
  providers: [JurisService]
})
export class JurisModule {}
