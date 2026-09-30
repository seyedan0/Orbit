import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SyncMutationEntity,
  TaskEntityModel,
  UserEntity,
  WorkspaceEntity
} from '../database/entities/index.js';
import { SYNC_REPOSITORY } from './interfaces/sync-repository.interface.js';
import { InMemorySyncRepository } from './repositories/in-memory-sync.repository.js';
import { PostgresSyncRepository } from './repositories/postgres-sync.repository.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskEntityModel,
      SyncMutationEntity,
      UserEntity,
      WorkspaceEntity
    ])
  ],
  controllers: [SyncController],
  providers: [
    SyncService,
    PostgresSyncRepository,
    InMemorySyncRepository,
    {
      provide: SYNC_REPOSITORY,
      useExisting: PostgresSyncRepository
    }
  ],
  exports: [SyncService, SYNC_REPOSITORY, PostgresSyncRepository, InMemorySyncRepository]
})
export class SyncModule {}
