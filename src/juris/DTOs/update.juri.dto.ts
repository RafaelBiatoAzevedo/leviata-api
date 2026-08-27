import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl } from 'class-validator';
import { CreateJuryDto } from './create-jury.dto';

export class UpdateJuryDto extends PartialType(CreateJuryDto) {
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
