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
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update.article.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateArticleWithImageDto } from './dto/create-article-with-cover.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { ArticlesService } from './articles.service';
import { ArticlesQueryDto } from './dto/article-query.dto';
import { ArticleResponseDto } from './dto/article-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('articles')
@ApiTags('Articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateArticleWithImageDto,
  })
  @ApiOperation({
    summary: 'Create article',
  })
  @ApiCreatedResponse({
    description: 'Article created successfully.',
    type: ArticleResponseDto,
  })
  create(@Body() dto: CreateArticleDto, @UploadedFile() cover?: any) {
    return this.articlesService.create(dto, cover);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List Articles',
  })
  @ApiOkResponse({
    description: 'Articles retrieved successfully.',
    type: ArticleResponseDto,
    isArray: true,
  })
  findAll(@Query() query: ArticlesQueryDto) {
    return this.articlesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get article by id',
  })
  @ApiParam({
    name: 'id',
    description: 'Article id',
  })
  @ApiOkResponse({
    description: 'Article retrieved successfully.',
    type: ArticleResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.articlesService.findOneById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update article',
  })
  @ApiParam({
    name: 'id',
    description: 'Article id',
  })
  @ApiOkResponse({
    description: 'Article updated successfully.',
    type: ArticleResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate article',
  })
  @ApiParam({
    name: 'id',
    description: 'Article id',
  })
  @ApiNoContentResponse({
    description: 'Article deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.articlesService.remove(id, req.user);
  }

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
    summary: 'Upload article cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'Article slug',
  })
  @ApiOkResponse({
    description: 'Article cover uploaded successfully.',
    type: ArticleResponseDto,
  })
  uploadCover(@Param('slug') slug: string, @UploadedFile() cover: any) {
    return this.articlesService.uploadCover(slug, cover);
  }

  @Delete('slug/:slug/cover')
  @ApiOperation({
    summary: 'Remove article cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'Article slug',
  })
  @ApiNoContentResponse({
    description: 'Article cover removed successfully.',
  })
  removeImage(@Param('slug') slug: string) {
    return this.articlesService.removeCover(slug);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get article by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Article slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Article retrieved successfully.',
    type: ArticleResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.articlesService.findOneBySlug(slug);
  }

  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update article',
  })
  @ApiParam({
    name: 'slug',
    description: 'Article slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Article updated successfully.',
    type: ArticleResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.updateBySlug(slug, dto);
  }

  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate article',
  })
  @ApiParam({
    name: 'slug',
    description: 'Article slug',
    example: 'livro-teste',
  })
  @ApiNoContentResponse({
    description: 'Article deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.articlesService.removeBySlug(slug, req.user);
  }
}
