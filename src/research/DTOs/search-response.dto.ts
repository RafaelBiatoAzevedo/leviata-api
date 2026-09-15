import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    example: 'Pesquisa escravidão e estado moderno',
  })
  title!: string;

  @ApiProperty({
    example: 'pesquisa-escravidao-e-estado-moderno',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'URL da imagem de capa da pesquisa.',
    example: 'https://cdn.exemplo.com/search/capa.jpg',
    nullable: true,
  })
  coverUrl!: string | null;

  @ApiPropertyOptional({
    description: 'Public ID da imagem de capa no Cloudinary.',
    example: 'leviata/research/pesquisa-escravidao-e-estado-moderno',
    nullable: true,
  })
  coverPublicId!: string | null;

  @ApiPropertyOptional({
    description: 'Conteúdo ou descrição da pesquisa.',
    example:
      'Pesquisa dedicada ao estudo das relações entre Estado Moderno e escravidão.',
    nullable: true,
  })
  content!: string | null;

  @ApiProperty({
    description: 'Pessoas relacionadas à pesquisa.',
    type: [Object],
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        firstName: 'João',
        lastName: 'Silva',
      },
    ],
  })
  people!: {
    id: string;
    firstName: string;
    lastName: string;
  }[];

  @ApiProperty({
    description: 'Imagens relacionadas à pesquisa.',
    type: [Object],
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        imageUrl: 'https://cdn.exemplo.com/search/imagem.jpg',
        description: 'Documento histórico relacionado à pesquisa.',
      },
    ],
  })
  images!: {
    id: string;
    imageUrl: string;
    description: string | null;
  }[];

  @ApiProperty({
    description: 'Imagens utilizadas como apoio à pesquisa.',
    type: [Object],
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        imageUrl: 'https://cdn.exemplo.com/search/support.jpg',
        description: 'Imagem de apoio.',
      },
    ],
  })
  supports!: {
    id: string;
    imageUrl: string;
    description: string | null;
  }[];

  @ApiProperty({
    example: '2026-09-14T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-09-14T12:00:00.000Z',
  })
  updatedAt!: Date;
}
