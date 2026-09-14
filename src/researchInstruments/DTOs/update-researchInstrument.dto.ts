import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateResearchInstrumentDto } from './create-researchInstrument.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl } from 'class-validator';

export class UpdateResearchInstrumentDto extends PartialType(
  CreateResearchInstrumentDto,
) {
  @ApiPropertyOptional({
    example: 'https://cdn.exemplo.com/instrumentos/dossie.pdf',
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  pdfUrl?: string;
}
