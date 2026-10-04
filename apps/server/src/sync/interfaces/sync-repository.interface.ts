import type { MutationPayload, TaskEntity } from '@orbit/shared-types';

export const SYNC_REPOSITORY = Symbol('SYNC_REPOSITORY');

export interface PullResult {
  changes: TaskEntity[];
  nextCursor: string;
  hasMore: boolean;
}

export interface ApplyMutationResult {
  status: 'APPLIED' | 'ALREADY_APPLIED' | 'CONFLICT_MERGED' | 'REJECTED';
  task?: TaskEntity;
  error?: string;
}

export interface CleanTombstonesOptions {
  userId?: string;
  retentionDays?: number;
  now?: Date;
  cutoffDate?: Date;
  onBeforeCommit?: (manager: unknown) => Promise<void>;
}

export interface CleanTombstonesResult {
  cleanedCount: number;
  cleanedTaskIds: string[];
}

export interface SyncRepository {
  getMutationByIdempotencyKey(
    userId: string,
    idempotencyKey: string
  ): Promise<MutationPayload | null>;

  saveAppliedMutation(userId: string, mutation: MutationPayload): Promise<void>;

  applyTaskMutation(userId: string, mutation: MutationPayload): Promise<TaskEntity>;

  applyMutationAtomic?(
    userId: string,
    mutation: MutationPayload
  ): Promise<ApplyMutationResult>;

  getChanges(
    userId: string,
    cursor: string | undefined,
    limit: number
  ): Promise<PullResult>;

  cleanTombstones(options?: CleanTombstonesOptions): Promise<CleanTombstonesResult>;
}
