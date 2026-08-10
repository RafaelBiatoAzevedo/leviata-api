import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountryResponseDto } from './dto/country-response.dto';
import { CountriesService } from './countries.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('countries')
@ApiTags('Countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'List countries',
  })
  @ApiOkResponse({
    description: 'Countries retrieved successfully.',
    type: CountryResponseDto,
    isArray: true,
  })
  findAll() {
    return this.countriesService.findAll();
  }
}
