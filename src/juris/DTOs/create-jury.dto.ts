import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateJuryDto {
  @ApiProperty({
    example: 'Julgamento de Dissertação - História do Cativeiro',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    example: '1985-05-12',
  })
  @IsNotEmpty()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  date!: Date;

  @ApiPropertyOptional({
    description: 'IDs dos juízes da banca.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
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
  judges?: string[];

  @ApiPropertyOptional({
    description: 'IDs dos jurados.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001'],
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
  jurors?: string[];

  @ApiPropertyOptional({
    description: 'IDs dos promotores.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440002'],
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
  prosecutors?: string[];

  @ApiPropertyOptional({
    description: 'IDs dos defensores.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440003'],
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
  defenders?: string[];

  @ApiPropertyOptional({
    description: 'IDs dos oficiais de justiça.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440004'],
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
  bailiffs?: string[];

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
    example: 'https://www.youtube.com/watch?v=abc123',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  recordingUrl?: string;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  meetingUrl?: string;
}
