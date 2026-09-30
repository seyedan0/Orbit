import type { MutationPayload, TaskEntity } from '@orbit/shared-types';

export const SYNC_REPOSITORY = Symbol('SYNC_REPOSITORY');

export interface PullResult {
  changes: TaskEntity[];
  nextCursor: string;
  hasMore: boolean;
}

export interface SyncRepository {
  getMutationByIdempotencyKey(
    userId: string,
    idempotencyKey: string
  ): Promise<MutationPayload | null>;

  saveAppliedMutation(userId: string, mutation: MutationPayload): Promise<void>;

  applyTaskMutation(userId: string, mutation: MutationPayload): Promise<TaskEntity>;

  getChanges(
    userId: string,
    cursor: string | undefined,
    limit: number
  ): Promise<PullResult>;
}
