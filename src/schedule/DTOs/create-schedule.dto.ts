import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ example: 'Encontro do Grupo Leviatã e o Cativeiro' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: '2026-10-15T14:00:00.000Z', format: 'date-time' })
  @IsDateString({ strict: true })
  date!: string;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string | null;

  @ApiPropertyOptional({ example: 'UNESP, Franca', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Link de inscrição ou site externo. Use este campo ou meetingId.',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  externalUrl?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description:
      'Evento cadastrado (interno ou externo). Ao vincular, substitui externalUrl.',
  })
  @IsOptional()
  @IsUUID('4')
  meetingId?: string | null;
}
