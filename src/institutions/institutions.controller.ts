import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { InstitutionResponseDto } from './dto/institution-response.dto';
import { InstitutionsService } from './institutions.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IUserJwt } from '../auth/jwt.strategy';
import { AdminGuard } from '../common/guards/admin.guard';
import { ApiPageResponse } from '../common/decorators/api-page-response.decorator';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { InstitutionQueryDto } from './dto/institution-query.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
@Controller('institutions')
@ApiTags('Institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create institution' })
  @ApiCreatedResponse({ type: InstitutionResponseDto })
  create(@Body() dto: CreateInstitutionDto) {
    return this.institutionsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List institutions',
  })
  @ApiOkResponse({
    description: 'Institutions retrieved successfully.',
    type: InstitutionResponseDto,
    isArray: true,
  })
  findAll(@Query() query: InstitutionQueryDto) {
    return this.institutionsService.findAll(query);
  }

  @Get('paginated')
  @ApiOperation({ summary: 'List institutions with pagination totals' })
  @ApiPageResponse(InstitutionResponseDto)
  findPage(@Query() query: InstitutionQueryDto) {
    return this.institutionsService.findPage(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get institution by id' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  findOneById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.institutionsService.findOneById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update institution' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  updateById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.institutionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete institution (superadministrator)' })
  @ApiNoContentResponse()
  removeById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.institutionsService.remove(id, req.user);
  }
}
