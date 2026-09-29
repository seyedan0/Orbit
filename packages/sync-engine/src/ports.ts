import type {
  MutationPayload,
  PullResponse,
  SyncQueueEntry,
  TaskEntity
} from '@orbit/shared-types';

export interface LocalStore {
  getTask(id: string): Promise<TaskEntity | undefined>;
  saveTask(task: TaskEntity): Promise<void>;
  enqueueMutation(mutation: SyncQueueEntry): Promise<void>;
  listPendingMutations(limit: number): Promise<SyncQueueEntry[]>;
  markMutationSucceeded(id: string): Promise<void>;
  markMutationFailed(id: string, error: string, nextAttemptAt: string): Promise<void>;
  getCursor(): Promise<string | undefined>;
  saveCursor(cursor: string): Promise<void>;
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
