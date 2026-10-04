import type {
  MutationPayload,
  PullResponse,
  QueueStatus,
  SyncQueueEntry,
  TaskEntity
} from '@orbit/shared-types';

/**
 * Low-level local persistence port. Adapters must keep stored state isolated
 * from callers (clone in/out) and never treat it as transactional across
 * methods; use {@link AtomicTaskStore} where entity + mutation consistency
 * is required.
 */
export interface LocalStore {
  getTask(id: string): Promise<TaskEntity | undefined>;
  saveTask(task: TaskEntity): Promise<void>;
  enqueueMutation(mutation: SyncQueueEntry): Promise<void>;
  listPendingMutations(limit: number): Promise<SyncQueueEntry[]>;
  markMutationInFlight(id: string, inFlightSince?: string): Promise<void>;
  listInFlightMutations(): Promise<SyncQueueEntry[]>;
  getMutation(id: string): Promise<SyncQueueEntry | undefined>;
  markMutationSucceeded(id: string): Promise<void>;
  markMutationFailed(
    id: string,
    error: string,
    nextAttemptAt: string,
    status?: QueueStatus
  ): Promise<void>;
  getCursor(): Promise<string | undefined>;
  saveCursor(cursor: string): Promise<void>;
  listTasks(projectId?: string, options?: { includeDeleted?: boolean }): Promise<TaskEntity[]>;
}

/**
 * Local store that can persist an entity and its mutation in one atomic
 * transaction: either both records survive a crash, or neither does.
 * Required by docs/architecture.md (atomic entity + mutation registration).
 *
 * Idempotency rule: if an entry with the same `idempotencyKey` already
 * exists, the mutation part is skipped silently and the task part is still
 * written, so retrying a save stays safe.
 */
export interface AtomicTaskStore extends LocalStore {
  saveTaskWithMutation(task: TaskEntity, mutation: SyncQueueEntry): Promise<void>;
}

export interface SyncTransport {
  push(mutations: MutationPayload[]): Promise<PushResult[]>;
  pull(cursor: string | undefined, limit: number): Promise<PullResponse>;
}

export type PushResultStatus =
  | 'APPLIED'
  | 'ALREADY_APPLIED'
  | 'CONFLICT_MERGED'
  | 'REJECTED'
  | 'RETRYABLE_ERROR';

export interface PushResult {
  mutationId: string;
  status: PushResultStatus;
  task?: TaskEntity;
  error?: string;
}
