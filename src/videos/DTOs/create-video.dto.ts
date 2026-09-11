import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({
    description: 'Título do vídeo',
    example: 'A escravidão no Brasil Colonial',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'URL do vídeo',
    example: 'https://www.youtube.com/watch?v=abc123',
  })
  @IsUrl()
  @IsNotEmpty()
  videoUrl!: string;

  @ApiPropertyOptional({
    description: 'Descrição do vídeo',
    example: 'Vídeo sobre as relações entre escravidão e Estado Moderno.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'IDs das pessoas relacionadas ao vídeo',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    ],
    type: [String],
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
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  people?: string[];
}
