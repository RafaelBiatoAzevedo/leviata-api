import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateNewsletterDto } from './create-newsletter.dto';

export class NewsletterPreviewDto extends PartialType(
  OmitType(CreateNewsletterDto, [
    'coverUrl',
    'title',
    'subject',
    'publishedAt',
  ] as const),
) {
  // A preview accepts unfinished fields; saving validates the complete edition.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  publishedAt?: string;

  // A local cropped cover can be previewed before it is uploaded.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverUrl?: string;
}
