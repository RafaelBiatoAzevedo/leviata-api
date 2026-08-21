import { ApiProperty } from '@nestjs/swagger';
import { CreateMeetingDto } from './create-meeting.dto';

export class CreateMeetingWithImageDto extends CreateMeetingDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  cover?: any;
}
