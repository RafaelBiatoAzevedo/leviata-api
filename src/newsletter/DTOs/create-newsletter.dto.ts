import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import { NewsletterContentDto } from './newsletter-content.dto';

export class CreateNewsletterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ type: NewsletterContentDto })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value) as unknown;
      } catch {
        return value;
      }
    }
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? plainToInstance(NewsletterContentDto, parsed)
      : parsed;
  })
  @IsObject()
  @ValidateNested()
  contentData?: NewsletterContentDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsDateString()
  sentAt?: string;
}
