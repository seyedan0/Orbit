import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { SyncModule } from './sync/sync.module.js';

@Module({
  imports: [HealthModule, SyncModule]
})
export class AppModule {}
