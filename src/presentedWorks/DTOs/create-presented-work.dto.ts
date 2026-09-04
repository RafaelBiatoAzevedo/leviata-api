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

export class CreatePresentedWorkDto {
  @ApiProperty({
    example: 'História do Cativeiro no Brasil',
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
    example: 'Auditório da Universidade',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description: 'ID do encontro ao qual o trabalho está relacionado.',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  meetingId?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/documento.pdf',
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  documentUrl?: string;

  @ApiPropertyOptional({
    example: 'https://eventos.unicamp.br/inscricao',
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  registrationUrl?: string;

  @ApiPropertyOptional({
    example: 'https://www.youtube.com/watch?v=abc123',
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  recordingUrl?: string;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  meetingUrl?: string;

  @ApiProperty({
    description: 'IDs dos autores do livro.',
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
  authors!: string[];
}
