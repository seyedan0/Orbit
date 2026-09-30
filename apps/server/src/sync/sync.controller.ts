import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Query } from '@nestjs/common';
import { UserId } from '../common/decorators/user-id.decorator.js';
import type {
  PullResponseBody,
  PushRequestBody,
  PushResponseBody
} from './dto/sync.dto.js';
import { SyncService } from './sync.service.js';

@Controller('sync')
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
}
