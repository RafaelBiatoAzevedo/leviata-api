import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SummaryReportResponseDto } from './dto/summary-report-response.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo dos conteúdos não excluídos do portal' })
  @ApiOkResponse({ type: SummaryReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Autenticação necessária.' })
  getSummary() {
    return this.reportsService.getSummary();
  }
}
