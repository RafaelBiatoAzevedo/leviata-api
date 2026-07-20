import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonCategory } from '@prisma/client';

export class PersonResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  category!: PersonCategory;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  displayOrder!: number;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  birthDate?: Date;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  orcid?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  lattesUrl?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  honorificTitle?: string;

  @ApiPropertyOptional()
  nationalityId?: string;

  @ApiPropertyOptional()
  academicTitleId?: string;

  @ApiPropertyOptional()
  institutionId?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
