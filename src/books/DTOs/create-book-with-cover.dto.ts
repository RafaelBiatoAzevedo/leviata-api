import { ApiProperty } from '@nestjs/swagger';
import { CreateBookDto } from './create-book.dto';

export class CreateBookWithCoverDto extends CreateBookDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  cover?: any;
}
