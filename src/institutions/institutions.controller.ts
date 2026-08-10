import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstitutionResponseDto } from './dto/institution-response.dto';
import { InstitutionsService } from './institutions.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('institutions')
@ApiTags('Institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'List institutions',
  })
  @ApiOkResponse({
    description: 'Institutions retrieved successfully.',
    type: InstitutionResponseDto,
    isArray: true,
  })
  findAll() {
    return this.institutionsService.findAll();
  }
}
