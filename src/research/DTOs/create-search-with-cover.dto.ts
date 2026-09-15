import { ApiProperty } from '@nestjs/swagger';
import { CreateSearchDto } from './create-search.dto';

export class CreateSearchWithCoverDto extends CreateSearchDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  cover?: any;
}
