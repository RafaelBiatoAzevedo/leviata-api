import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonCategory } from '@prisma/client';

export class CreatePersonDto {
  @ApiProperty({
    example: 'larissa-biato',
  })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiProperty({
    example: 'Larissa Biato',
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    enum: PersonCategory,
  })
  @IsEnum(PersonCategory)
  category: PersonCategory;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    example: 'https://site.com/avatar.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: '1985-05-12',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

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
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  lattesUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({
    example: 'Prof.ª Dr.ª',
  })
  @IsOptional()
  @IsString()
  honorificTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  nationalityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  academicTitleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}