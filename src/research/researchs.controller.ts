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
import { ResearchService } from './researchs.service';
import { SearchResponseDto } from './DTOs/search-response.dto';
import { CreateSearchDto } from './DTOs/create-search.dto';
import { ResearchQueryDto } from './DTOs/research-query.dto';
import { UpdateSearchDto } from './DTOs/update.search.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateSearchWithCoverDto } from './DTOs/create-search-with-cover.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { UploadImageResponseDto } from 'src/images/DTOs/upload-image-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('research')
@ApiTags('Research')
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @ApiBearerAuth()
  @Post()
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateSearchWithCoverDto,
  })
  @ApiOperation({
    summary: 'Create search',
  })
  @ApiCreatedResponse({
    description: 'Search created successfully.',
    type: SearchResponseDto,
  })
  create(@Body() dto: CreateSearchDto, @UploadedFile() cover?: any) {
    return this.researchService.create(dto, cover);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List research',
  })
  @ApiOkResponse({
    description: 'Research retrieved successfully.',
    type: SearchResponseDto,
    isArray: true,
  })
  findAll(@Query() query: ResearchQueryDto) {
    return this.researchService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get search by id',
  })
  @ApiParam({
    name: 'id',
    description: 'Search id',
  })
  @ApiOkResponse({
    description: 'Search retrieved successfully.',
    type: SearchResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.researchService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update search',
  })
  @ApiParam({
    name: 'id',
    description: 'Search id',
  })
  @ApiOkResponse({
    description: 'Search updated successfully.',
    type: SearchResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdateSearchDto) {
    return this.researchService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate search',
  })
  @ApiParam({
    name: 'id',
    description: 'Search id',
  })
  @ApiNoContentResponse({
    description: 'Search deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.researchService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug/cover')
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateSearchWithCoverDto,
  })
  @ApiOperation({
    summary: 'Upload search cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'Search slug',
  })
  @ApiOkResponse({
    description: 'Search cover uploaded successfully.',
    type: UploadImageResponseDto,
  })
  uploadCover(@Param('slug') slug: string, @UploadedFile() cover: any) {
    return this.researchService.uploadCover(slug, cover);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug/cover')
  @ApiOperation({
    summary: 'Remove search cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'Search slug',
  })
  @ApiNoContentResponse({
    description: 'Search cover removed successfully.',
  })
  removeImage(@Param('slug') slug: string) {
    return this.researchService.removeCover(slug);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get search by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Search slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Search retrieved successfully.',
    type: SearchResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.researchService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update search',
  })
  @ApiParam({
    name: 'slug',
    description: 'Search slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Search updated successfully.',
    type: SearchResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateSearchDto) {
    return this.researchService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate search',
  })
  @ApiParam({
    name: 'slug',
    description: 'Search slug',
    example: 'livro-teste',
  })
  @ApiNoContentResponse({
    description: 'Search deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.researchService.removeBySlug(slug, req.user);
  }
}
