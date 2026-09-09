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
import { ThematicsService } from './thematics.service';
import { ThematicResponseDto } from './DTOs/thematic-response.dto';
import { ThematicsQueryDto } from './DTOs/thematic-query.dto';
import { UpdateThematicDto } from './DTOs/update-thematic.dto';
import { CreateThematicDto } from './DTOs/create-thematic.dto';

@UseGuards(JwtAuthGuard)
@Controller('Thematics')
@ApiTags('Thematics')
export class ThematicsController {
  constructor(private readonly ThematicsService: ThematicsService) {}

  @ApiBearerAuth()
  @Post()
  @ApiBody({
    type: CreateThematicDto,
  })
  @ApiOperation({
    summary: 'Create Thematic',
  })
  @ApiCreatedResponse({
    description: 'Thematic created successfully.',
    type: ThematicResponseDto,
  })
  create(@Body() dto: CreateThematicDto) {
    return this.ThematicsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List Thematics',
  })
  @ApiOkResponse({
    description: 'Thematics retrieved successfully.',
    type: ThematicResponseDto,
    isArray: true,
  })
  findAll(@Query() query: ThematicsQueryDto) {
    return this.ThematicsService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get Thematic by id',
  })
  @ApiParam({
    name: 'id',
    description: 'Thematic id',
  })
  @ApiOkResponse({
    description: 'Thematic retrieved successfully.',
    type: ThematicResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.ThematicsService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update Thematic',
  })
  @ApiParam({
    name: 'id',
    description: 'Thematic id',
  })
  @ApiOkResponse({
    description: 'Thematic updated successfully.',
    type: ThematicResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdateThematicDto) {
    return this.ThematicsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate Thematic',
  })
  @ApiParam({
    name: 'id',
    description: 'Thematic id',
  })
  @ApiNoContentResponse({
    description: 'Thematic deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.ThematicsService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get Thematic by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Thematic slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Thematic retrieved successfully.',
    type: ThematicResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.ThematicsService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update Thematic',
  })
  @ApiParam({
    name: 'slug',
    description: 'Thematic slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Thematic updated successfully.',
    type: ThematicResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateThematicDto) {
    return this.ThematicsService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate Thematic',
  })
  @ApiParam({
    name: 'slug',
    description: 'Thematic slug',
    example: 'livro-teste',
  })
  @ApiNoContentResponse({
    description: 'Thematic deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.ThematicsService.removeBySlug(slug, req.user);
  }
}
