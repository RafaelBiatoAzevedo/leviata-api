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

import { UpdatePresentedWorkDto } from './DTOs/update-presented-work.dto';
import { CreatePresentedWorkDto } from './DTOs/create-presented-work.dto';
import { PresentedWorksService } from './presented-works.service';
import { PresentedWorkResponseDto } from './DTOs/presented-work-response.dto';
import { PresentedWorksQueryDto } from './DTOs/presented-work-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('presented-works')
@ApiTags('Presented Works')
export class PresentedWorksController {
  constructor(private readonly presentedWorksService: PresentedWorksService) {}

  @ApiBearerAuth()
  @Post()
  @ApiBody({
    type: CreatePresentedWorkDto,
  })
  @ApiOperation({
    summary: 'Create presentedWork',
  })
  @ApiCreatedResponse({
    description: 'PresentedWork created successfully.',
    type: PresentedWorkResponseDto,
  })
  create(@Body() dto: CreatePresentedWorkDto) {
    return this.presentedWorksService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List presentedWorks',
  })
  @ApiOkResponse({
    description: 'PresentedWorks retrieved successfully.',
    type: PresentedWorkResponseDto,
    isArray: true,
  })
  findAll(@Query() query: PresentedWorksQueryDto) {
    return this.presentedWorksService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get presentedWork by id',
  })
  @ApiParam({
    name: 'id',
    description: 'PresentedWork id',
  })
  @ApiOkResponse({
    description: 'PresentedWork retrieved successfully.',
    type: PresentedWorkResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.presentedWorksService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update presentedWork',
  })
  @ApiParam({
    name: 'id',
    description: 'PresentedWork id',
  })
  @ApiOkResponse({
    description: 'PresentedWork updated successfully.',
    type: PresentedWorkResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdatePresentedWorkDto) {
    return this.presentedWorksService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate presentedWork',
  })
  @ApiParam({
    name: 'id',
    description: 'PresentedWork id',
  })
  @ApiNoContentResponse({
    description: 'PresentedWork deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.presentedWorksService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get presentedWork by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'PresentedWork slug',
    example: 'trabalho-história',
  })
  @ApiOkResponse({
    description: 'PresentedWork retrieved successfully.',
    type: PresentedWorkResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.presentedWorksService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update presentedWork',
  })
  @ApiParam({
    name: 'slug',
    description: 'PresentedWork slug',
    example: 'trabalho-história',
  })
  @ApiOkResponse({
    description: 'PresentedWork updated successfully.',
    type: PresentedWorkResponseDto,
  })
  updateBySlug(
    @Param('slug') slug: string,
    @Body() dto: UpdatePresentedWorkDto,
  ) {
    return this.presentedWorksService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate presentedWork',
  })
  @ApiParam({
    name: 'slug',
    description: 'PresentedWork slug',
    example: 'trabalho-história',
  })
  @ApiNoContentResponse({
    description: 'PresentedWork deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.presentedWorksService.removeBySlug(slug, req.user);
  }
}
