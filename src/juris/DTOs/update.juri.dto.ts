import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl } from 'class-validator';
import { CreateBookDto } from 'src/books/DTOs/create-book.dto';

export class UpdateJuryDto extends PartialType(CreateBookDto) {
  @ApiPropertyOptional({
    example: 'https://site.com/cover.jpg',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  coverUrl?: string;
}
