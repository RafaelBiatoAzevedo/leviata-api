import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthRepository } from './auth.repository';
import { LoginRequestDto } from './dto/login.request.dto';
import { User } from '@prisma/client';
import { RefreshRequestDto } from './dto/refresh.request.dto';
import { RefreshResponseDto } from './dto/refresh.response.dto';
import { JwtPayload } from './jwt.strategy';
import { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async generateAccessToken(user: User) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return accessToken;
  }

  private async generateRefreshToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn:
          this.configService.get<StringValue>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      },
    );
  }

  async login(dto: LoginRequestDto) {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateAccessToken(user);

    const refreshToken = await this.generateRefreshToken(user);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.authRepository.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refresh(dto: RefreshRequestDto): Promise<RefreshResponseDto> {
    try {
      console.log('entrou', dto.refreshToken);
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      console.log(payload);

      const user = await this.authRepository.findUserByEmail(payload.email);

      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User is inactive.');
      }

      if (!user.hashedRefreshToken) {
        throw new UnauthorizedException('Refresh token not found.');
      }

      console.log('teste', dto.refreshToken);

      const refreshTokenMatches = await bcrypt.compare(
        dto.refreshToken,
        user.hashedRefreshToken,
      );

      if (!refreshTokenMatches) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const accessToken = await this.generateAccessToken(user);

      const refreshToken = await this.generateRefreshToken(user);

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      await this.authRepository.updateRefreshToken(user.id, hashedRefreshToken);

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.clearRefreshToken(userId);
  }
}
