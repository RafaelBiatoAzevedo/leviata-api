import { ApiPageResponse } from '../common/decorators/api-page-response.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IUserJwt } from '../auth/jwt.strategy';
import { Public } from '../common/decorators/public.decorator';
import { CreateScheduleDto } from './DTOs/create-schedule.dto';
import { ScheduleQueryDto } from './DTOs/schedule-query.dto';
import { ScheduleResponseDto } from './DTOs/schedule-response.dto';
import { UpdateScheduleDto } from './DTOs/update-schedule.dto';
import { ScheduleService } from './schedule.service';

@UseGuards(JwtAuthGuard)
@Controller('schedule')
@ApiTags('Schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create schedule event' })
  @ApiCreatedResponse({ type: ScheduleResponseDto })
  create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List schedule events' })
  @ApiOkResponse({ type: ScheduleResponseDto, isArray: true })
  findAll(@Query() query: ScheduleQueryDto) {
    return this.scheduleService.findAll(query);
  }

  @ApiBearerAuth()
  @Get('paginated')
  @ApiOperation({ summary: 'List records with pagination totals' })
  @ApiPageResponse(ScheduleResponseDto)
  findPage(@Query() query: ScheduleQueryDto) {
    return this.scheduleService.findPage(query);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get schedule event by slug' })
  @ApiOkResponse({ type: ScheduleResponseDto })
  findOneBySlug(@Param('slug') slug: string) {
    return this.scheduleService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({ summary: 'Update schedule event by slug' })
  @ApiOkResponse({ type: ScheduleResponseDto })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete schedule event by slug' })
  @ApiNoContentResponse()
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.scheduleService.removeBySlug(slug, req.user);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get schedule event by id' })
  @ApiOkResponse({ type: ScheduleResponseDto })
  findOneById(@Param('id') id: string) {
    return this.scheduleService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update schedule event by id' })
  @ApiOkResponse({ type: ScheduleResponseDto })
  updateById(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete schedule event by id' })
  @ApiNoContentResponse()
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.scheduleService.remove(id, req.user);
  }
}
