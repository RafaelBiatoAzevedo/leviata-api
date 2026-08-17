import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IUserJwt } from 'src/auth/jwt.strategy';

import { Public } from 'src/common/decorators/public.decorator';
import { NewsService } from './news.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateNewsWithImageDto } from './dto/create-news-with-cover.dto';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsResponseDto } from './dto/news-response.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { UpdateNewsDto } from './dto/update.news.dto';

@UseGuards(JwtAuthGuard)
@Controller('news')
@ApiTags('News')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @ApiBearerAuth()
  @Post()
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateNewsWithImageDto,
  })
  @ApiOperation({
    summary: 'Create news',
  })
  @ApiCreatedResponse({
    description: 'News created successfully.',
    type: NewsResponseDto,
  })
  create(@Body() dto: CreateNewsDto, @UploadedFile() cover?: any) {
    return this.newsService.create(dto, cover);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List newss',
  })
  @ApiOkResponse({
    description: 'News retrieved successfully.',
    type: NewsResponseDto,
    isArray: true,
  })
  findAll(@Query() query: NewsQueryDto) {
    return this.newsService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get news by id',
  })
  @ApiParam({
    name: 'id',
    description: 'News id',
  })
  @ApiOkResponse({
    description: 'News retrieved successfully.',
    type: NewsResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.newsService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update news',
  })
  @ApiParam({
    name: 'id',
    description: 'News id',
  })
  @ApiOkResponse({
    description: 'News updated successfully.',
    type: NewsResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate news',
  })
  @ApiParam({
    name: 'id',
    description: 'News id',
  })
  @ApiNoContentResponse({
    description: 'News deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.newsService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug/cover')
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload news cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'News slug',
  })
  @ApiOkResponse({
    description: 'News cover uploaded successfully.',
    type: NewsResponseDto,
  })
  uploadCover(@Param('slug') slug: string, @UploadedFile() cover: any) {
    return this.newsService.uploadCover(slug, cover);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug/cover')
  @ApiOperation({
    summary: 'Remove news cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'News slug',
  })
  @ApiNoContentResponse({
    description: 'News cover removed successfully.',
  })
  removeImage(@Param('slug') slug: string) {
    return this.newsService.removeCover(slug);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get news by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'News slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'News retrieved successfully.',
    type: NewsResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.newsService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update news',
  })
  @ApiParam({
    name: 'slug',
    description: 'News slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'News updated successfully.',
    type: NewsResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate news',
  })
  @ApiParam({
    name: 'slug',
    description: 'News slug',
    example: 'livro-teste',
  })
  @ApiNoContentResponse({
    description: 'News deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.newsService.removeBySlug(slug, req.user);
  }
}
