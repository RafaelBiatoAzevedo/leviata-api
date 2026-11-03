import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateInstitutionDto {
  @ApiProperty({ example: 'Universidade Estadual Paulista', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome da instituição.' })
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'UNESP', maxLength: 50 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Informe a sigla da instituição.' })
  @MaxLength(50)
  acronym!: string;

  @ApiProperty({ format: 'uuid', description: 'ID de um país cadastrado.' })
  @IsUUID('4', { message: 'Selecione um país válido.' })
  countryId!: string;
}
