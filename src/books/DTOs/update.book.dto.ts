import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateBookDto } from './create-book.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl } from 'class-validator';

export class UpdateBookDto extends PartialType(CreateBookDto) {
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
