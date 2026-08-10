import { ApiProperty } from '@nestjs/swagger';

export class CoverBookResponseDto {
  @ApiProperty({
    example: 'leviata/books/livro-teste',
  })
  publicId!: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/seu-cloud/images/upload/v1754460000/leviata/books/livro-teste.jpg',
  })
  url!: string;
}
