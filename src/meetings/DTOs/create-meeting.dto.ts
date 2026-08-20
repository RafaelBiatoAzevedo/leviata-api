import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingType } from '@prisma/client';

export class CreateMeetingDto {
  @ApiProperty({
    example: MeetingType.SEMINAR,
    enum: MeetingType,
  })
  @IsEnum(MeetingType)
  type!: MeetingType;

  @ApiProperty({
    example: 'Seminário: História e Memória',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example:
      'Seminário sobre história, memória e as pesquisas desenvolvidas pelo grupo Leviatã.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '2026-09-15T19:00:00.000Z',
  })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({
    example: 'Auditório da Universidade',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    example: 'https://eventos.unicamp.br/inscricao',
  })
  @IsOptional()
  @IsUrl()
  registrationUrl?: string;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
  })
  @IsOptional()
  @IsUrl()
  meetingUrl?: string;

  @ApiPropertyOptional({
    description: 'IDs das pessoas que participarão como palestrantes.',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  speakersIds?: string[];
}
