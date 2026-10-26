import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonCategory } from '@prisma/client';
import { Transform } from 'class-transformer';

// Pessoas externas podem participar sem formação ou vínculo institucional.
const requiresProfileField = (person: CreatePersonDto, value: unknown) =>
  person.category !== PersonCategory.EXTERNO || value != null;
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export class CreatePersonDto {
  @ApiProperty({
    example: 'Larissa Biato',
  })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example: PersonCategory.COORDENADOR,
    enum: PersonCategory,
  })
  @IsEnum(PersonCategory)
  category!: PersonCategory;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    example: '1985-05-12',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  birthDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    example: '0000-0002-1825-0097',
  })
  @IsOptional()
  @IsString()
  orcid?: string;

  @ApiPropertyOptional({
    example: 'larissa@email.com',
    description: 'Opcional para participantes externos.',
    nullable: true,
  })
  @Transform(emptyToNull)
  @ValidateIf(requiresProfileField)
  @IsString()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  lattesUrl?: string;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({
    example: 'Prof.ª Dr.ª',
  })
  @IsOptional()
  @IsString()
  honorificTitle?: string;

  @ApiPropertyOptional({
    description: 'Opcional para participantes externos.',
    nullable: true,
  })
  @Transform(emptyToNull)
  @ValidateIf(requiresProfileField)
  @IsUUID()
  nationalityId?: string | null;

  @ApiPropertyOptional({
    description: 'Opcional para participantes externos.',
    nullable: true,
  })
  @Transform(emptyToNull)
  @ValidateIf(requiresProfileField)
  @IsUUID()
  academicTitleId?: string | null;

  @ApiPropertyOptional({
    description: 'Opcional para participantes externos.',
    nullable: true,
  })
  @Transform(emptyToNull)
  @ValidateIf(requiresProfileField)
  @IsUUID()
  institutionId?: string | null;
}
