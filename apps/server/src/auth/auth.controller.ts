import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import type { AuthResponse, AuthUser } from '@orbit/shared-types';
import { UserId } from '../common/decorators/user-id.decorator.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService
  ) {}

  @Post('register')
  async register(@Body() body: unknown): Promise<AuthResponse> {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown): Promise<AuthResponse> {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@UserId() userId: string): Promise<AuthUser> {
    const profile = await this.authService.findProfile(userId);
    if (!profile) throw new UnauthorizedException();
    return profile;
  }
}
