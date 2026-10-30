import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { BoardType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
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
    description:
      'Tipo da banca de progressão ou conclusão de curso: qualificação ou defesa.',
    enum: BoardType,
    enumName: 'BoardType',
    example: BoardType.QUALIFICATION,
  })
  @IsEnum(BoardType)
  type!: BoardType;

  @ApiProperty({
    description: 'ID do candidato',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  candidateId!: string;

  @ApiProperty({
    description: 'ID do orientador',
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
    description: 'Data e hora da banca em ISO 8601, com fuso horário.',
    format: 'date-time',
    example: '2026-10-30T14:30:00-03:00',
  })
  @IsNotEmpty()
  @IsDate()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || value instanceof Date
      ? new Date(value)
      : new Date(NaN),
  )
  date!: Date;

  @ApiProperty({
    example: 'https://revista.com/artigo/historia-cativeiro',
  })
  @IsUrl()
  meetingUrl!: string;
}
