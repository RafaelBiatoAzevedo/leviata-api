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

import { FileInterceptor } from '@nestjs/platform-express';

import { Public } from 'src/common/decorators/public.decorator';
import { BoardsService } from './boards.service';
import { BoardResponseDto } from './DTOs/board-response.dto';
import { BoardsQueryDto } from './DTOs/board-query.dto';
import { UpdateBoardDto } from './DTOs/update-board.dto';
import { CreateBoardDto } from './DTOs/create-board.dto';

@UseGuards(JwtAuthGuard)
@Controller('boards')
@ApiTags('Boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @ApiBearerAuth()
  @Post()
  @ApiBody({
    type: CreateBoardDto,
  })
  @ApiOperation({
    summary: 'Create board',
  })
  @ApiCreatedResponse({
    description: 'Board created successfully.',
    type: BoardResponseDto,
  })
  create(@Body() dto: CreateBoardDto, @UploadedFile()) {
    return this.boardsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List boards',
  })
  @ApiOkResponse({
    description: 'Boards retrieved successfully.',
    type: BoardResponseDto,
    isArray: true,
  })
  findAll(@Query() query: BoardsQueryDto) {
    return this.boardsService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get board by id',
  })
  @ApiParam({
    name: 'id',
    description: 'Board id',
  })
  @ApiOkResponse({
    description: 'Board retrieved successfully.',
    type: BoardResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.boardsService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update board',
  })
  @ApiParam({
    name: 'id',
    description: 'Board id',
  })
  @ApiOkResponse({
    description: 'Board updated successfully.',
    type: BoardResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boardsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate board',
  })
  @ApiParam({
    name: 'id',
    description: 'Board id',
  })
  @ApiNoContentResponse({
    description: 'Board deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.boardsService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get board by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Board slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Board retrieved successfully.',
    type: BoardResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.boardsService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update board',
  })
  @ApiParam({
    name: 'slug',
    description: 'Board slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Board updated successfully.',
    type: BoardResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateBoardDto) {
    return this.boardsService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate board',
  })
  @ApiParam({
    name: 'slug',
    description: 'Board slug',
    example: 'livro-teste',
  })
  @ApiNoContentResponse({
    description: 'Board deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.boardsService.removeBySlug(slug, req.user);
  }
}
