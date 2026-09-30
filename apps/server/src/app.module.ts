import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './database/database.config.js';
import { HealthModule } from './health/health.module.js';
import { SyncModule } from './sync/sync.module.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig()
    }),
    HealthModule,
    SyncModule
  ]
})
export class AppModule {}
