import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginResponseDto } from './dto/login.response.dto';
import { LoginRequestDto } from './dto/login.request.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MeResponseDto } from './dto/me.response.dto';
import { RefreshRequestDto } from './dto/refresh.request.dto';
import { RefreshResponseDto } from './dto/refresh.response.dto';
import { Role } from '@prisma/client';
import { Public } from 'src/common/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Authenticate user',
  })
  @ApiOkResponse({
    type: LoginResponseDto,
  })
  login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({
    summary: 'Logout authenticated user',
  })
  @ApiNoContentResponse({
    description: 'User logged out successfully.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Req() req: Request & { user: { id: string } }) {
    return this.authService.logout(req.user.id);
  }

  @ApiBearerAuth()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
  })
  @ApiOkResponse({
    type: RefreshResponseDto,
  })
  refresh(@Body() dto: RefreshRequestDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get authenticated user',
  })
  @ApiOkResponse({
    type: MeResponseDto,
  })
  me(
    @Req() req: Request & { user: { id: string; email: string; role: Role } },
  ) {
    return req.user;
  }
}
