import { Controller, Get, UseGuards } from '@nestjs/common';
import { AcademicTitlesService } from './academic-titles.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AcademicTitleResponseDto } from './dto/academic-title-response.dto';

@Controller('academic-titles')
export class AcademicTitlesController {
  constructor(private readonly academicTitlesService: AcademicTitlesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'List Academic Titles',
  })
  @ApiOkResponse({
    description: 'Academic Titles retrieved successfully.',
    type: AcademicTitleResponseDto,
    isArray: true,
  })
  findAll() {
    return this.academicTitlesService.findAll();
  }
}
