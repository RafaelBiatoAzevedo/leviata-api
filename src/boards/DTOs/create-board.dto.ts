import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBoardDto {
  @ApiProperty({
    example:
      'Olhares estrangeiros: a escravidão no Brasil presente nos relatos de viajantes ingleses',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'ID do candidato',
    type: IsUUID,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  candidateId!: string;

  @ApiProperty({
    description: 'ID do orientador',
    type: IsUUID,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  advisorId!: string;

  @ApiProperty({
    description: 'IDs dos membros da banca.',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value;
    }

    try {
      const parsed: unknown = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : value;
    } catch {
      return value;
    }
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  members!: string[];

  @ApiProperty({
    example: '1985-05-12',
  })
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  date!: string;

  @ApiProperty({
    example: 'https://revista.com/artigo/historia-cativeiro',
  })
  @IsUrl()
  externalUrl!: string;
}
