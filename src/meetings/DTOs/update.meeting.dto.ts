import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateMeetingDto } from './create-meeting.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl } from 'class-validator';

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {
  @ApiPropertyOptional({
    example: 'https://site.com/cover.jpg',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  coverUrl?: string;
}
