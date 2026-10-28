import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingType } from '@prisma/client';

export class ScheduleMeetingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: MeetingType }) type!: MeetingType;
  @ApiProperty() isInternal!: boolean;
}

export class ScheduleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) subtitle!: string | null;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ format: 'date-time' }) date!: Date;
  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  endDate!: Date | null;
  @ApiPropertyOptional({ nullable: true }) location!: string | null;
  @ApiPropertyOptional({ nullable: true }) externalUrl!: string | null;
  @ApiPropertyOptional({ nullable: true, format: 'uuid' }) meetingId!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: ScheduleMeetingResponseDto })
  meeting!: ScheduleMeetingResponseDto | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
