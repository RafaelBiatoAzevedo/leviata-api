import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';
import { PeopleRepository } from './people.repository';

@Module({
  imports: [PrismaModule],
  controllers: [PeopleController],
  providers: [PeopleService, PeopleRepository],
})
export class PeopleModule {}
