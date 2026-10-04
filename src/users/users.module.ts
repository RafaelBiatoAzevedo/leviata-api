import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { SuperAdminGuard } from './super-admin.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, SuperAdminGuard],
})
export class UsersModule {}
