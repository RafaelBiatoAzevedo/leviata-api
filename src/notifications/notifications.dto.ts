import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class NotificationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @ApiPropertyOptional({ default: 15, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 15;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: ['all', 'unread', 'pending', 'scheduled'] })
  @IsOptional()
  @IsIn(['all', 'unread', 'pending', 'scheduled'])
  status?: 'all' | 'unread' | 'pending' | 'scheduled';
}

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateNotificationDto {
  @ApiProperty({ enum: ['INFO', 'REMINDER'] })
  @IsIn(['INFO', 'REMINDER'])
  type!: 'INFO' | 'REMINDER';

  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(3, 120)
  title!: string;

  @ApiProperty({ maxLength: 500 })
  @Transform(trim)
  @IsString()
  @Length(3, 500)
  message!: string;

  @ApiPropertyOptional({
    description: 'When the reminder becomes visible, ISO 8601 with timezone',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  visibleAt?: string;
}
