import type {
  QueueStatus,
  SyncQueueEntry,
  TaskEntity,
  TagEntity,
  TagGroupEntity
} from '@orbit/shared-types';
import type { AtomicTagStore, AtomicTaskStore } from '@orbit/sync-engine';

/**
 * In-memory AtomicTaskStore used only in tests and as a reference implementation.
 * It must not be used as the runtime store in production pages after Phase 2.
 * JavaScript's single-threaded execution makes its "atomic" operations safe in
 * practice, though they are not backed by a real transaction.
 */
export class MemoryLocalStore implements AtomicTaskStore, AtomicTagStore {
  private readonly tasks = new Map<string, TaskEntity>();
  private readonly tags = new Map<string, TagEntity>();
  private readonly tagGroups = new Map<string, TagGroupEntity>();
  private readonly queue = new Map<string, SyncQueueEntry>();
  private cursor: string | undefined;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async getTask(id: string): Promise<TaskEntity | undefined> {
    const task = this.tasks.get(id);
    return task === undefined ? undefined : structuredClone(task);
  }

  async saveTask(task: TaskEntity): Promise<void> {
    this.tasks.set(task.id, structuredClone(task));
  }

  async listTasks(
    projectId?: string,
    options?: { includeDeleted?: boolean }
  ): Promise<TaskEntity[]> {
    return [...this.tasks.values()]
      .filter(
        (t) =>
          (projectId ? t.projectId === projectId : true) &&
          (options?.includeDeleted ? true : t.deletedAt == null)
      )
      .map((t) => structuredClone(t));
  }

  async saveTaskWithMutation(task: TaskEntity, mutation: SyncQueueEntry): Promise<void> {
    // Idempotency: skip enqueueing if this idempotencyKey already exists.
    // Always write the task (upsert).
    const hasMutation = [...this.queue.values()].some(
      (e) => e.idempotencyKey === mutation.idempotencyKey
    );
    this.tasks.set(task.id, structuredClone(task));
    if (!hasMutation) {
      this.queue.set(mutation.id, structuredClone(mutation));
    }
  }

  async enqueueMutation(mutation: SyncQueueEntry): Promise<void> {
    const hasMutation = [...this.queue.values()].some(
      (e) => e.idempotencyKey === mutation.idempotencyKey
    );
    if (hasMutation) return;
    this.queue.set(mutation.id, structuredClone(mutation));
  }

  async listPendingMutations(limit: number): Promise<SyncQueueEntry[]> {
    const nowMs = this.now().getTime();
    return [...this.queue.values()]
      .filter(
        (entry) =>
          entry.status === 'PENDING' && Date.parse(entry.nextAttemptAt) <= nowMs
      )
      .sort(
        (a, b) =>
          Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
          a.id.localeCompare(b.id)
      )
      .slice(0, Math.max(0, limit))
      .map((entry) => structuredClone(entry));
  }

  async markMutationInFlight(id: string, inFlightSince?: string): Promise<void> {
    const entry = this.queue.get(id);
    if (entry === undefined) return;
    this.queue.set(id, {
      ...entry,
      status: 'IN_FLIGHT',
      inFlightSince: inFlightSince ?? this.now().toISOString()
    });
  }

  async listInFlightMutations(): Promise<SyncQueueEntry[]> {
    return [...this.queue.values()]
      .filter((entry) => entry.status === 'IN_FLIGHT')
      .sort(
        (a, b) =>
          Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
          a.id.localeCompare(b.id)
      )
      .map((entry) => structuredClone(entry));
  }

  async markMutationSucceeded(id: string): Promise<void> {
    const entry = this.queue.get(id);
    if (entry === undefined) return;
    const { inFlightSince: _discard, ...rest } = entry;
    this.queue.set(id, {
      ...rest,
      status: 'SUCCEEDED'
    });
  }

  async markMutationFailed(
    id: string,
    error: string,
    nextAttemptAt: string,
    status: QueueStatus = 'PENDING'
  ): Promise<void> {
    const entry = this.queue.get(id);
    if (entry === undefined) return;
    const { inFlightSince: _discard, ...rest } = entry;
    this.queue.set(id, {
      ...rest,
      status,
      attemptCount: entry.attemptCount + 1,
      nextAttemptAt,
      lastError: error
    });
  }

  async getMutation(id: string): Promise<SyncQueueEntry | undefined> {
    const entry = this.queue.get(id);
    return entry === undefined ? undefined : structuredClone(entry);
  }

  async getCursor(): Promise<string | undefined> {
    return this.cursor;
  }

  async saveCursor(cursor: string): Promise<void> {
    this.cursor = cursor;
  }

  async getTag(id: string): Promise<TagEntity | undefined> {
    const tag = this.tags.get(id);
    return tag === undefined ? undefined : structuredClone(tag);
  }

  async saveTag(tag: TagEntity): Promise<void> {
    this.tags.set(tag.id, structuredClone(tag));
  }

  async listTags(options?: { includeDeleted?: boolean }): Promise<TagEntity[]> {
    return [...this.tags.values()]
      .filter((t) => (options?.includeDeleted ? true : t.deletedAt == null))
      .map((t) => structuredClone(t));
  }

  async saveTagWithMutation(tag: TagEntity, mutation: SyncQueueEntry): Promise<void> {
    const hasMutation = [...this.queue.values()].some(
      (e) => e.idempotencyKey === mutation.idempotencyKey
    );
    this.tags.set(tag.id, structuredClone(tag));
    if (!hasMutation) {
      this.queue.set(mutation.id, structuredClone(mutation));
    }
  }

  async getTagGroup(id: string): Promise<TagGroupEntity | undefined> {
    const group = this.tagGroups.get(id);
    return group === undefined ? undefined : structuredClone(group);
  }

  async saveTagGroup(group: TagGroupEntity): Promise<void> {
    this.tagGroups.set(group.id, structuredClone(group));
  }

  async listTagGroups(options?: { includeDeleted?: boolean }): Promise<TagGroupEntity[]> {
    return [...this.tagGroups.values()]
      .filter((g) => (options?.includeDeleted ? true : g.deletedAt == null))
      .map((g) => structuredClone(g));
  }

  async saveTagGroupWithMutation(
    group: TagGroupEntity,
    mutation: SyncQueueEntry
  ): Promise<void> {
    const hasMutation = [...this.queue.values()].some(
      (e) => e.idempotencyKey === mutation.idempotencyKey
    );
    this.tagGroups.set(group.id, structuredClone(group));
    if (!hasMutation) {
      this.queue.set(mutation.id, structuredClone(mutation));
    }
  }
}
