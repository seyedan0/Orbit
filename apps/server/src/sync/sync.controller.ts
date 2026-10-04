import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UserId } from '../common/decorators/user-id.decorator.js';
import type {
  PullResponseBody,
  PushRequestBody,
  PushResponseBody
} from './dto/sync.dto.js';
import { SyncService } from './sync.service.js';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(
    @Inject(SyncService)
    private readonly syncService: SyncService
  ) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  async push(
    @UserId() userId: string,
    @Body() body: PushRequestBody
  ): Promise<PushResponseBody> {
    return this.syncService.push(userId, body);
  }

  @Get('pull')
  async pull(
    @UserId() userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ): Promise<PullResponseBody> {
    return this.syncService.pull(userId, cursor, limit);
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanup(
    @UserId() userId: string,
    @Query('retentionDays') retentionDays?: string
  ) {
    const days = retentionDays ? parseInt(retentionDays, 10) : undefined;
    return this.syncService.cleanTombstones({
      userId,
      retentionDays: days && !Number.isNaN(days) ? days : undefined
    });
  }
}
