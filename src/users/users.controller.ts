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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IUserJwt } from '../auth/jwt.strategy';
import { ApiPageResponse } from '../common/decorators/api-page-response.decorator';
import { CreateUserDto } from './DTOs/create-user.dto';
import { UpdateUserDto } from './DTOs/update-user.dto';
import { UpdateAccountDto } from './DTOs/update-account.dto';
import { UserResponseDto } from './DTOs/user-response.dto';
import { UsersQueryDto } from './DTOs/user-query.dto';
import { SuperAdminGuard } from './super-admin.guard';
import { UsersService } from './users.service';

type AuthenticatedRequest = { user: IUserJwt };

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated account' })
  @ApiOkResponse({ type: UserResponseDto })
  me(@Req() req: AuthenticatedRequest) {
    return this.users.findOne(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile or change own credentials' })
  @ApiOkResponse({ type: UserResponseDto })
  updateAccount(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.users.updateAccount(req.user.id, dto);
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create user' })
  @ApiCreatedResponse({ type: UserResponseDto })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'List users' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll(@Query() query: UsersQueryDto) {
    return this.users.findAll(query);
  }

  @Get('paginated')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'List users with pagination totals' })
  @ApiPageResponse(UserResponseDto)
  findPage(@Query() query: UsersQueryDto) {
    return this.users.findPage(query);
  }

  @Get(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOkResponse({ type: UserResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.remove(id, req.user);
  }
}
