import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AnalyticsCollector } from './analytics.collector';
import { AnalyticsQueryDto, CollectAnalyticsDto } from './analytics.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('report')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Relatório anônimo de audiência; cache interno de cinco minutos',
  })
  report(@Query() query: AnalyticsQueryDto) {
    return this.service.report(query);
  }
}

// Deliberately separate from the authenticated read controller.
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsCollectController {
  constructor(private readonly collector: AnalyticsCollector) {}

  @Post('collect')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @Header('Retry-After', '60')
  @ApiOperation({
    summary: 'Recebe uma visualização anônima de rota pública permitida',
  })
  collect(@Body() dto: CollectAnalyticsDto, @Req() req: Request) {
    return this.collector.collect(dto, req);
  }
}
