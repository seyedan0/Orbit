import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { getDatabaseConfig } from './database/database.config.js';
import { HealthModule } from './health/health.module.js';
import { SyncModule } from './sync/sync.module.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig()
    }),
    AuthModule,
    HealthModule,
    SyncModule
  ]
})
export class AppModule {}
