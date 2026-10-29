import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PAGE_LABELS, SOURCES } from './analytics.contract';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
export class CollectAnalyticsDto {
  @IsUUID('4')
  id: string;

  @IsString()
  @MaxLength(150)
  @IsIn(Object.keys(PAGE_LABELS))
  path: string;

  @IsString()
  @IsIn(Object.keys(SOURCES))
  source: string;
}
