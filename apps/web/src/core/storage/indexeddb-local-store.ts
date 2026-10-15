import type {
  QueueStatus,
  SyncQueueEntry,
  TaskEntity,
  TagEntity,
  TagGroupEntity,
  SmartFilterEntity,
  FocusSessionEntity
} from '@orbit/shared-types';
import type {
  AtomicFilterStore,
  AtomicFocusStore,
  AtomicTagStore,
  AtomicTaskStore
} from '@orbit/sync-engine';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

// ---- Schema ----

interface OrbitDBSchema extends DBSchema {
  tasks: {
    key: string;
    value: TaskEntity;
    indexes: { 'by-projectId': string };
  };
  tags: {
    key: string;
    value: TagEntity;
  };
  tagGroups: {
    key: string;
    value: TagGroupEntity;
  };
  smartFilters: {
    key: string;
    value: SmartFilterEntity;
  };
  focusSessions: {
    key: string;
    value: FocusSessionEntity;
    indexes: { 'by-taskId': string };
  };
  mutations: {
    key: string;
    value: SyncQueueEntry;
    indexes: { 'by-idempotencyKey': string };
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
}

type OrbitDB = IDBPDatabase<OrbitDBSchema>;

const CURRENT_VERSION = 4;

// ---- Implementation ----

/**
 * Durable AtomicTaskStore backed by IndexedDB (via the `idb` library).
 * Used as the runtime store in the Web app (Phase 2+).
 *
 * The `dbName` parameter is primarily useful in tests (unique names per test
 * ensure isolation when using fake-indexeddb).
 */
export class IndexedDbLocalStore implements AtomicTaskStore, AtomicTagStore, AtomicFilterStore, AtomicFocusStore {
  private db: OrbitDB | undefined;

  constructor(
    private readonly dbName: string = 'orbit-local',
    private readonly now: () => Date = () => new Date()
  ) {}

  private async getDb(): Promise<OrbitDB> {
    if (this.db !== undefined) return this.db;
    this.db = await openDB<OrbitDBSchema>(this.dbName, CURRENT_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // tasks store with projectId index for listTasks
          const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
          tasks.createIndex('by-projectId', 'projectId');

          // mutations store with idempotencyKey index for deduplication
          const mutations = db.createObjectStore('mutations', { keyPath: 'id' });
          mutations.createIndex('by-idempotencyKey', 'idempotencyKey');

          // meta store for cursor and future key-value metadata
          db.createObjectStore('meta', { keyPath: 'key' });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('tags')) {
            db.createObjectStore('tags', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('tagGroups')) {
            db.createObjectStore('tagGroups', { keyPath: 'id' });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('smartFilters')) {
            db.createObjectStore('smartFilters', { keyPath: 'id' });
          }
        }
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('focusSessions')) {
            const focusSessions = db.createObjectStore('focusSessions', { keyPath: 'id' });
            focusSessions.createIndex('by-taskId', 'taskId');
          }
        }
      }
    });
    return this.db;
  }

  async getTask(id: string): Promise<TaskEntity | undefined> {
    const db = await this.getDb();
    return db.get('tasks', id);
  }

  async saveTask(task: TaskEntity): Promise<void> {
    const db = await this.getDb();
    await db.put('tasks', task);
  }

  async listTasks(
    projectId?: string,
    options?: { includeDeleted?: boolean }
  ): Promise<TaskEntity[]> {
    const db = await this.getDb();
    const all = projectId
      ? await db.getAllFromIndex('tasks', 'by-projectId', projectId)
      : await db.getAll('tasks');
    if (options?.includeDeleted) {
      return all;
    }
    return all.filter((t) => t.deletedAt == null);
  }

  /**
   * Persists the task (upsert) and the mutation in a single IndexedDB
   * transaction, satisfying the atomicity requirement in architecture.md.
   *
   * Idempotency: if a mutation with the same `idempotencyKey` already exists,
   * the mutation write is skipped silently. The task is always written.
   */
  async saveTaskWithMutation(task: TaskEntity, mutation: SyncQueueEntry): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['tasks', 'mutations'], 'readwrite');
    const mutationsStore = tx.objectStore('mutations');
    const tasksStore = tx.objectStore('tasks');

    const existing = await mutationsStore
      .index('by-idempotencyKey')
      .get(mutation.idempotencyKey);

    if (existing === undefined) {
      await mutationsStore.add(mutation);
    }
    await tasksStore.put(task);
    await tx.done;
  }

  async enqueueMutation(mutation: SyncQueueEntry): Promise<void> {
    const db = await this.getDb();
    const existing = await db.getFromIndex(
      'mutations',
      'by-idempotencyKey',
      mutation.idempotencyKey
    );
    if (existing !== undefined) return;
    await db.put('mutations', mutation);
  }

  async listPendingMutations(limit: number): Promise<SyncQueueEntry[]> {
    const db = await this.getDb();
    const all = await db.getAll('mutations');
    const nowMs = this.now().getTime();
    return all
      .filter(
        (entry) =>
          entry.status === 'PENDING' && Date.parse(entry.nextAttemptAt) <= nowMs
      )
      .sort(
        (a, b) =>
          Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
          a.id.localeCompare(b.id)
      )
      .slice(0, Math.max(0, limit));
  }

  async markMutationInFlight(id: string, inFlightSince?: string): Promise<void> {
    const db = await this.getDb();
    const entry = await db.get('mutations', id);
    if (entry === undefined) return;
    await db.put('mutations', {
      ...entry,
      status: 'IN_FLIGHT',
      inFlightSince: inFlightSince ?? this.now().toISOString()
    });
  }

  async listInFlightMutations(): Promise<SyncQueueEntry[]> {
    const db = await this.getDb();
    const all = await db.getAll('mutations');
    return all
      .filter((entry) => entry.status === 'IN_FLIGHT')
      .sort(
        (a, b) =>
          Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
          a.id.localeCompare(b.id)
      );
  }

  async markMutationSucceeded(id: string): Promise<void> {
    const db = await this.getDb();
    const entry = await db.get('mutations', id);
    if (entry === undefined) return;
    const { inFlightSince: _discard, ...rest } = entry;
    await db.put('mutations', {
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
    const db = await this.getDb();
    const entry = await db.get('mutations', id);
    if (entry === undefined) return;
    const { inFlightSince: _discard, ...rest } = entry;
    await db.put('mutations', {
      ...rest,
      status,
      attemptCount: entry.attemptCount + 1,
      nextAttemptAt,
      lastError: error
    });
  }

  async getMutation(id: string): Promise<SyncQueueEntry | undefined> {
    const db = await this.getDb();
    return db.get('mutations', id);
  }

  async getCursor(): Promise<string | undefined> {
    const db = await this.getDb();
    const record = await db.get('meta', 'cursor');
    return record?.value;
  }

  async saveCursor(cursor: string): Promise<void> {
    const db = await this.getDb();
    await db.put('meta', { key: 'cursor', value: cursor });
  }

  async getTag(id: string): Promise<TagEntity | undefined> {
    const db = await this.getDb();
    return db.get('tags', id);
  }

  async saveTag(tag: TagEntity): Promise<void> {
    const db = await this.getDb();
    await db.put('tags', tag);
  }

  async listTags(options?: { includeDeleted?: boolean }): Promise<TagEntity[]> {
    const db = await this.getDb();
    const all = await db.getAll('tags');
    if (options?.includeDeleted) {
      return all;
    }
    return all.filter((t) => t.deletedAt == null);
  }

  async saveTagWithMutation(tag: TagEntity, mutation: SyncQueueEntry): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['tags', 'mutations'], 'readwrite');
    const mutationsStore = tx.objectStore('mutations');
    const tagsStore = tx.objectStore('tags');

    const existing = await mutationsStore
      .index('by-idempotencyKey')
      .get(mutation.idempotencyKey);

    if (existing === undefined) {
      await mutationsStore.add(mutation);
    }
    await tagsStore.put(tag);
    await tx.done;
  }

  async getTagGroup(id: string): Promise<TagGroupEntity | undefined> {
    const db = await this.getDb();
    return db.get('tagGroups', id);
  }

  async saveTagGroup(group: TagGroupEntity): Promise<void> {
    const db = await this.getDb();
    await db.put('tagGroups', group);
  }

  async listTagGroups(options?: { includeDeleted?: boolean }): Promise<TagGroupEntity[]> {
    const db = await this.getDb();
    const all = await db.getAll('tagGroups');
    if (options?.includeDeleted) {
      return all;
    }
    return all.filter((g) => g.deletedAt == null);
  }

  async saveTagGroupWithMutation(
    group: TagGroupEntity,
    mutation: SyncQueueEntry
  ): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['tagGroups', 'mutations'], 'readwrite');
    const mutationsStore = tx.objectStore('mutations');
    const groupsStore = tx.objectStore('tagGroups');

    const existing = await mutationsStore
      .index('by-idempotencyKey')
      .get(mutation.idempotencyKey);

    if (existing === undefined) {
      await mutationsStore.add(mutation);
    }
    await groupsStore.put(group);
    await tx.done;
  }

  async getSmartFilter(id: string): Promise<SmartFilterEntity | undefined> {
    const db = await this.getDb();
    return db.get('smartFilters', id);
  }

  async saveSmartFilter(filter: SmartFilterEntity): Promise<void> {
    const db = await this.getDb();
    await db.put('smartFilters', filter);
  }

  async listSmartFilters(options?: { includeDeleted?: boolean }): Promise<SmartFilterEntity[]> {
    const db = await this.getDb();
    const all = await db.getAll('smartFilters');
    if (options?.includeDeleted) {
      return all;
    }
    return all.filter((f) => f.deletedAt == null);
  }

  async saveSmartFilterWithMutation(
    filter: SmartFilterEntity,
    mutation: SyncQueueEntry
  ): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['smartFilters', 'mutations'], 'readwrite');
    const mutationsStore = tx.objectStore('mutations');
    const filtersStore = tx.objectStore('smartFilters');

    const existing = await mutationsStore
      .index('by-idempotencyKey')
      .get(mutation.idempotencyKey);

    if (existing === undefined) {
      await mutationsStore.add(mutation);
    }
    await filtersStore.put(filter);
    await tx.done;
  }

  async getFocusSession(id: string): Promise<FocusSessionEntity | undefined> {
    const db = await this.getDb();
    return db.get('focusSessions', id);
  }

  async saveFocusSession(session: FocusSessionEntity): Promise<void> {
    const db = await this.getDb();
    await db.put('focusSessions', session);
  }

  async listFocusSessions(options?: {
    taskId?: string;
    includeCancelled?: boolean;
  }): Promise<FocusSessionEntity[]> {
    const db = await this.getDb();
    const all = options?.taskId
      ? await db.getAllFromIndex('focusSessions', 'by-taskId', options.taskId)
      : await db.getAll('focusSessions');
    if (options?.includeCancelled) {
      return all;
    }
    return all.filter((s) => s.status !== 'CANCELLED');
  }

  async saveFocusSessionWithMutation(
    session: FocusSessionEntity,
    mutation: SyncQueueEntry
  ): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['focusSessions', 'mutations'], 'readwrite');
    const mutationsStore = tx.objectStore('mutations');
    const focusStore = tx.objectStore('focusSessions');

    const existing = await mutationsStore
      .index('by-idempotencyKey')
      .get(mutation.idempotencyKey);

    if (existing === undefined) {
      await mutationsStore.add(mutation);
    }
    await focusStore.put(session);
    await tx.done;
  }
}
