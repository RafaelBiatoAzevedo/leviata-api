import { Controller, UseGuards } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
@ApiTags('Meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}
}
