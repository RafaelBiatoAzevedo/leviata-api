import { ApiProperty } from '@nestjs/swagger';
import { CreateResearchInstrumentDto } from './create-researchInstrument.dto';

export class CreateResearchInstrumentWithPdfDto extends CreateResearchInstrumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  pdf?: any;
}
