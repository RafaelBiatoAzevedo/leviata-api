import { ApiProperty } from '@nestjs/swagger';

export class InstitutionResponseDto {
  @ApiProperty({
    example: 'c4f8b46c-c3e4-4e9c-8b06-6cb89d8a7b68',
  })
  id!: string;

  @ApiProperty({
    example: 'Universidade Estadual Paulista "Júlio de Mesquita Filho"',
  })
  name!: string;

  @ApiProperty({
    example: 'UNESP',
  })
  acronym!: string;

  @ApiProperty({
    example: '2a0d97f2-0c7f-4d36-b8d8-9e59d96dfdf9',
  })
  countryId!: string;

  @ApiProperty({
    example: '2026-07-31T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-07-31T10:00:00.000Z',
  })
  updatedAt!: Date;
}
