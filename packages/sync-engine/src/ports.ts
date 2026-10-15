import type {
  MutationPayload,
  PullResponse,
  QueueStatus,
  SyncQueueEntry,
  TaskEntity,
  TagEntity,
  TagGroupEntity,
  SmartFilterEntity
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

  // Optional tag & tag group storage methods
  getTag?(id: string): Promise<TagEntity | undefined>;
  saveTag?(tag: TagEntity): Promise<void>;
  listTags?(options?: { includeDeleted?: boolean }): Promise<TagEntity[]>;
  getTagGroup?(id: string): Promise<TagGroupEntity | undefined>;
  saveTagGroup?(group: TagGroupEntity): Promise<void>;
  listTagGroups?(options?: { includeDeleted?: boolean }): Promise<TagGroupEntity[]>;

  // Optional smart filter storage methods
  getSmartFilter?(id: string): Promise<SmartFilterEntity | undefined>;
  saveSmartFilter?(filter: SmartFilterEntity): Promise<void>;
  listSmartFilters?(options?: { includeDeleted?: boolean }): Promise<SmartFilterEntity[]>;
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
  saveTagWithMutation?(tag: TagEntity, mutation: SyncQueueEntry): Promise<void>;
  saveTagGroupWithMutation?(group: TagGroupEntity, mutation: SyncQueueEntry): Promise<void>;
  saveSmartFilterWithMutation?(filter: SmartFilterEntity, mutation: SyncQueueEntry): Promise<void>;
}

/**
 * Local store port for Tag and TagGroup entities with atomic mutation registration.
 */
export interface AtomicTagStore {
  getTag(id: string): Promise<TagEntity | undefined>;
  saveTag(tag: TagEntity): Promise<void>;
  listTags(options?: { includeDeleted?: boolean }): Promise<TagEntity[]>;
  saveTagWithMutation(tag: TagEntity, mutation: SyncQueueEntry): Promise<void>;
  getTagGroup(id: string): Promise<TagGroupEntity | undefined>;
  saveTagGroup(group: TagGroupEntity): Promise<void>;
  listTagGroups(options?: { includeDeleted?: boolean }): Promise<TagGroupEntity[]>;
  saveTagGroupWithMutation(group: TagGroupEntity, mutation: SyncQueueEntry): Promise<void>;
}

/**
 * Local store port for SmartFilterEntity with atomic mutation registration.
 */
export interface AtomicFilterStore {
  getSmartFilter(id: string): Promise<SmartFilterEntity | undefined>;
  saveSmartFilter(filter: SmartFilterEntity): Promise<void>;
  listSmartFilters(options?: { includeDeleted?: boolean }): Promise<SmartFilterEntity[]>;
  saveSmartFilterWithMutation(filter: SmartFilterEntity, mutation: SyncQueueEntry): Promise<void>;
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
