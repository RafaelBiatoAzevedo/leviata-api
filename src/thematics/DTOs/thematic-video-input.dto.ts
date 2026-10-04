import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class ThematicVideoInputDto {
  @ApiPropertyOptional({
    description: 'ID do vínculo existente, apenas na edição.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID('4')
  id?: string;

  @ApiProperty({ description: 'ID de um vídeo cadastrado.' })
  @IsUUID('4')
  videoId!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pessoa vinculada a este vídeo na temática.',
  })
  @IsOptional()
  @IsUUID('4')
  personId?: string | null;

  @ApiProperty({ maxLength: 255 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
