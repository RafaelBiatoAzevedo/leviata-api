import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class NewsletterContentItemDto {
  @ApiProperty() @IsString() @MaxLength(80) id!: string;
  @ApiProperty() @IsString() @MaxLength(300) title!: string;
  @ApiProperty() @IsString() @MaxLength(20000) text!: string;
  @ApiProperty() @IsString() @MaxLength(500) details!: string;
  @ApiProperty() @IsString() @MaxLength(2000) imageUrl!: string;
  @ApiProperty() @IsString() @MaxLength(300) imageAlt!: string;
  @ApiProperty() @IsString() @MaxLength(2000) linkUrl!: string;
  @ApiProperty() @IsString() @MaxLength(100) linkLabel!: string;
}

export class NewsletterContentSectionDto {
  @ApiProperty() @IsString() @MaxLength(80) id!: string;
  @ApiProperty() @IsString() @MaxLength(200) title!: string;
  @ApiProperty({ enum: ['stories', 'briefs'] })
  @IsIn(['stories', 'briefs'])
  layout!: 'stories' | 'briefs';
  @ApiProperty({ type: [NewsletterContentItemDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => NewsletterContentItemDto)
  items!: NewsletterContentItemDto[];
}

export class NewsletterContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  customHtml?: string;
  @ApiProperty() @Equals(1) version!: 1;
  @ApiProperty({ enum: ['visual', 'html'] }) @IsIn(['visual', 'html']) mode!:
    | 'visual'
    | 'html';
  @ApiProperty({ enum: ['CLASSIC', 'EDITORIAL', 'MAGAZINE'] })
  @IsIn(['CLASSIC', 'EDITORIAL', 'MAGAZINE'])
  template!: 'CLASSIC' | 'EDITORIAL' | 'MAGAZINE';
  @ApiProperty({ enum: ['paper', 'white', 'ink'] })
  @IsIn(['paper', 'white', 'ink'])
  background!: 'paper' | 'white' | 'ink';
  @ApiProperty({ enum: ['double', 'line', 'none'] })
  @IsIn(['double', 'line', 'none'])
  frame!: 'double' | 'line' | 'none';
  @ApiProperty() @IsString() @MaxLength(200) masthead!: string;
  @ApiProperty() @IsString() @MaxLength(500) tagline!: string;
  @ApiProperty() @IsString() @MaxLength(100) editionLabel!: string;
  @ApiProperty() @IsString() @MaxLength(10000) intro!: string;
  @ApiProperty() @IsString() @MaxLength(2000) footer!: string;
  @ApiProperty({ type: [NewsletterContentSectionDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => NewsletterContentSectionDto)
  sections!: NewsletterContentSectionDto[];
}
