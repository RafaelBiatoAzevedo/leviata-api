import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NewsletterContentDto } from './newsletter-content.dto';

export class NewsletterResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() subject!: string;
  @ApiProperty() htmlContent!: string;
  @ApiPropertyOptional({ type: NewsletterContentDto, nullable: true })
  contentData?: NewsletterContentDto | null;
  @ApiPropertyOptional({ nullable: true }) coverUrl?: string | null;
  @ApiPropertyOptional({ nullable: true, readOnly: true }) pdfUrl?:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, readOnly: true })
  pdfGeneratedAt?: Date | null;
  @ApiPropertyOptional({ nullable: true }) publishedAt?: Date | null;
  @ApiPropertyOptional({ nullable: true }) sentAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
