import { Module } from '@nestjs/common';
import { SYNC_REPOSITORY } from './interfaces/sync-repository.interface.js';
import { InMemorySyncRepository } from './repositories/in-memory-sync.repository.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';

@Module({
  controllers: [SyncController],
  providers: [
    SyncService,
    InMemorySyncRepository,
    {
      provide: SYNC_REPOSITORY,
      useExisting: InMemorySyncRepository
    }
  ],
  exports: [SyncService, SYNC_REPOSITORY, InMemorySyncRepository]
})
export class SyncModule {}
