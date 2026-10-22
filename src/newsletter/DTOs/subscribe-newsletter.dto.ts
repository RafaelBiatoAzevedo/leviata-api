import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

function optionalText({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() || undefined : value;
}

export class SubscribeNewsletterDto {
  @ApiProperty({ example: 'pessoa@exemplo.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254, { message: 'O e-mail deve ter no máximo 254 caracteres.' })
  email!: string;

  @ApiPropertyOptional()
  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  @MaxLength(255, { message: 'O nome deve ter no máximo 255 caracteres.' })
  name?: string;

  @ApiPropertyOptional()
  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'O telefone deve ser um texto.' })
  @MaxLength(30, { message: 'O telefone deve ter no máximo 30 caracteres.' })
  cellphone?: string;
}
