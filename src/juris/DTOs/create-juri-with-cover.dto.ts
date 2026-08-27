import { ApiProperty } from '@nestjs/swagger';
import { CreateBookDto } from './create-juri.dto';

export class CreateBookWithImageDto extends CreateBookDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  cover?: any;
}
