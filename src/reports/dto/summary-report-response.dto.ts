import { ApiProperty } from '@nestjs/swagger';

export class ReportItemDto {
  @ApiProperty({ example: 'books' })
  key: string;

  @ApiProperty({ example: 'Livros' })
  label: string;

  @ApiProperty({ example: 12 })
  total: number;
}

export class SummaryReportResponseDto {
  @ApiProperty({ example: 'Resumo do portal' })
  title: string;

  @ApiProperty({ format: 'date-time' })
  generatedAt: string;

  @ApiProperty({ example: 42 })
  totalRecords: number;

  @ApiProperty({ type: [ReportItemDto] })
  items: ReportItemDto[];
}
