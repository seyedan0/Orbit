import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  SyncMutationEntity,
  TaskEntityModel,
  UserEntity,
  WorkspaceEntity
} from './entities/index.js';
import { InitialSyncSchema1727650000000 } from './migrations/1727650000000-InitialSyncSchema.js';

if (typeof process.loadEnvFile === 'function') {
  const envCandidates = ['.env', 'apps/server/.env'];
  for (const envPath of envCandidates) {
    try {
      process.loadEnvFile(envPath);
      break;
    } catch {
      // Try next candidate
    }
  }
}

export function getDatabaseConfig(): TypeOrmModuleOptions {
  const url = process.env.DATABASE_URL;

  const baseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    entities: [UserEntity, WorkspaceEntity, TaskEntityModel, SyncMutationEntity],
    migrations: [InitialSyncSchema1727650000000],
    migrationsRun: true,
    synchronize: false
  };

  if (url) {
    const isSsl =
      url.includes('sslmode=require') ||
      url.includes('neon.tech') ||
      process.env.DB_SSL === 'true';
    return {
      ...baseConfig,
      url,
      ssl: isSsl ? { rejectUnauthorized: false } : false
    };
  }

  const isSsl = process.env.DB_SSL === 'true';

  return {
    ...baseConfig,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'orbit',
    ssl: isSsl ? { rejectUnauthorized: false } : false
  };
}
