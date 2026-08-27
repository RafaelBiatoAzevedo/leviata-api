import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateMeetingDto {
  @ApiProperty({
    example: 'Seminário: História e Memória',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    example: MeetingType.SEMINAR,
    enum: MeetingType,
  })
  @IsEnum(MeetingType)
  type!: MeetingType;

  @ApiPropertyOptional({
    example:
      'Seminário sobre história, memória e as pesquisas desenvolvidas pelo grupo Leviatã.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '1985-05-12',
  })
  @IsNotEmpty()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  date!: Date;

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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  registrationUrl?: string;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  meetingUrl?: string;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  recordingUrl?: string;

  @ApiPropertyOptional({
    description: 'IDs das pessoas que participarão como palestrantes.',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value;
    }

    try {
      const parsed: unknown = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : value;
    } catch {
      return value;
    }
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  speakers?: string[];
}
