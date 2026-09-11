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
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
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
import { VideosService } from './videos.service';
import { VideoResponseDto } from './DTOs/video-response.dto';
import { VideosQueryDto } from './DTOs/video-query.dto';
import { UpdateVideoDto } from './DTOs/update-video.dto';
import { CreateVideoDto } from './DTOs/create-video.dto';

@UseGuards(JwtAuthGuard)
@Controller('videos')
@ApiTags('Videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @ApiBearerAuth()
  @Post()
  @ApiBody({
    type: CreateVideoDto,
  })
  @ApiOperation({
    summary: 'Create video',
  })
  @ApiCreatedResponse({
    description: 'Video created successfully.',
    type: VideoResponseDto,
  })
  create(@Body() dto: CreateVideoDto) {
    return this.videosService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List videos',
  })
  @ApiOkResponse({
    description: 'Videos retrieved successfully.',
    type: VideoResponseDto,
    isArray: true,
  })
  findAll(@Query() query: VideosQueryDto) {
    return this.videosService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get video by id',
  })
  @ApiParam({
    name: 'id',
    description: 'Video id',
  })
  @ApiOkResponse({
    description: 'Video retrieved successfully.',
    type: VideoResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.videosService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update video',
  })
  @ApiParam({
    name: 'id',
    description: 'Video id',
  })
  @ApiOkResponse({
    description: 'Video updated successfully.',
    type: VideoResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdateVideoDto) {
    return this.videosService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate video',
  })
  @ApiParam({
    name: 'id',
    description: 'Video id',
  })
  @ApiNoContentResponse({
    description: 'Video deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.videosService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get video by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Video slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Video retrieved successfully.',
    type: VideoResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.videosService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update video',
  })
  @ApiParam({
    name: 'slug',
    description: 'Video slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Video updated successfully.',
    type: VideoResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateVideoDto) {
    return this.videosService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate video',
  })
  @ApiParam({
    name: 'slug',
    description: 'Video slug',
    example: 'livro-teste',
  })
  @ApiNoContentResponse({
    description: 'Video deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.videosService.removeBySlug(slug, req.user);
  }
}
