import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreatePersonDto } from './create-person.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl } from 'class-validator';

export class UpdatePersonDto extends PartialType(CreatePersonDto) {
  @ApiPropertyOptional({
    example: 'https://site.com/avatar.jpg',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
