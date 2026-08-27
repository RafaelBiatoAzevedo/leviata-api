import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonResponseDto } from 'src/people/DTOs/person-response.dto';

export class BookResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    example: 'leviata-e-o-cativeiro',
  })
  slug!: string;

  @ApiProperty({
    example: 'Leviatã e o Cativeiro',
  })
  title!: string;

  @ApiPropertyOptional({
    example: 'História, Memória e Sociedade',
  })
  subtitle?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.leviata.com/books/leviata.jpg',
  })
  coverUrl?: string;

  @ApiPropertyOptional({
    example: 'Livro que reúne pesquisas sobre o cativeiro no Brasil.',
  })
  description?: string;

  @ApiPropertyOptional({
    example: '9788535933929',
  })
  isbn?: string;

  @ApiPropertyOptional({
    example: 2025,
  })
  year?: number;

  @ApiPropertyOptional({
    example: 'Editora Unicamp',
  })
  publisher?: string;

  @ApiPropertyOptional({
    example: 'https://editora.com/livro/leviata',
  })
  externalUrl?: string;

  @ApiProperty({
    type: [PersonResponseDto],
  })
  authors!: PersonResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
