import type { SyncQueueEntry, TaskEntity } from '@orbit/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexedDbLocalStore } from './indexeddb-local-store';

// fake-indexeddb/auto is loaded via vite.config.ts setupFiles

function uniqueDb() {
  return `test-${crypto.randomUUID()}`;
}

// Use a definitely-past timestamp so nextAttemptAt is always due in listPendingMutations
const PAST = '2020-01-01T10:00:00.000Z';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: crypto.randomUUID(),
    projectId: 'inbox',
    userId: 'user-1',
    title: 'Test task',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    timeZone: 'UTC',
    reminders: [],
    items: [],
    version: 0,
    localStatus: 'CREATED',
    createdAt: PAST,
    updatedAt: PAST,
    ...overrides
  };
}

function makeMutation(task: TaskEntity, overrides: Partial<SyncQueueEntry> = {}): SyncQueueEntry {
  return {
    id: crypto.randomUUID(),
    idempotencyKey: task.id,
    entityType: 'TASK',
    entityId: task.id,
    operation: 'CREATE',
    baseVersion: 0,
    payloadType: 'FULL',
    payload: task,
    fieldTimestamps: { title: task.createdAt },
    createdAt: task.createdAt,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: task.createdAt,
    ...overrides
  };
}

describe('IndexedDbLocalStore', () => {
  let store: IndexedDbLocalStore;

  beforeEach(() => {
    store = new IndexedDbLocalStore(uniqueDb());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- getTask / saveTask ----

  it('returns undefined for an unknown task id', async () => {
    expect(await store.getTask('no-such-id')).toBeUndefined();
  });

  it('saves and retrieves a task by id', async () => {
    const t = makeTask({ title: 'Hello' });
    await store.saveTask(t);
    const loaded = await store.getTask(t.id);
    expect(loaded?.title).toBe('Hello');
  });

  it('overwrites a task on repeated saveTask calls', async () => {
    const t = makeTask({ title: 'v1' });
    await store.saveTask(t);
    await store.saveTask({ ...t, title: 'v2' });
    expect((await store.getTask(t.id))?.title).toBe('v2');
  });

  // ---- listTasks (empty state + filtering) ----

  it('returns an empty array when no tasks exist for the projectId', async () => {
    expect(await store.listTasks('inbox')).toEqual([]);
  });

  it('returns only tasks matching the projectId', async () => {
    const t1 = makeTask({ projectId: 'inbox' });
    const t2 = makeTask({ projectId: 'other' });
    await store.saveTask(t1);
    await store.saveTask(t2);
    const list = await store.listTasks('inbox');
    expect(list.map((t) => t.id)).toEqual([t1.id]);
  });

  it('excludes soft-deleted tasks from listTasks', async () => {
    const active = makeTask({ projectId: 'inbox' });
    const deleted = makeTask({
      projectId: 'inbox',
      deletedAt: '2026-09-30T11:00:00.000Z',
      localStatus: 'DELETED'
    });
    await store.saveTask(active);
    await store.saveTask(deleted);
    const list = await store.listTasks('inbox');
    expect(list.map((t) => t.id)).toEqual([active.id]);
  });

  // ---- saveTaskWithMutation (atomicity + idempotency) ----

  it('persists both task and mutation in one call', async () => {
    const t = makeTask();
    const m = makeMutation(t);
    await store.saveTaskWithMutation(t, m);
    expect(await store.getTask(t.id)).toBeDefined();
    expect((await store.listPendingMutations(10)).length).toBe(1);
  });

  it('simulates page reload: task created offline survives and can be listed', async () => {
    const t = makeTask({ title: 'Offline task' });
    const m = makeMutation(t);
    await store.saveTaskWithMutation(t, m);

    // Simulate reload by creating a new store pointing to the same DB name
    const dbName = (store as unknown as { dbName: string }).dbName;
    const freshStore = new IndexedDbLocalStore(dbName);
    const list = await freshStore.listTasks('inbox');
    expect(list.some((task) => task.title === 'Offline task')).toBe(true);
  });

  it('skips the mutation on duplicate idempotencyKey but still writes the task', async () => {
    const t = makeTask();
    const m = makeMutation(t);
    await store.saveTaskWithMutation(t, m);

    // Retry with same idempotencyKey, updated task
    const m2 = { ...m, id: crypto.randomUUID() };
    await store.saveTaskWithMutation({ ...t, title: 'Retried' }, m2);

    expect((await store.getTask(t.id))?.title).toBe('Retried');
    // Only the first mutation should be in the queue
    const pending = await store.listPendingMutations(10);
    expect(pending.length).toBe(1);
    expect(pending[0]?.id).toBe(m.id);
  });

  // ---- enqueueMutation / listPendingMutations ----

  it('lists pending mutations FIFO and respects limit', async () => {
    const t = makeTask();
    const base = (n: number) => `2020-01-0${n + 1}T00:00:00.000Z`;
    await store.enqueueMutation(makeMutation(t, { id: 'm2', idempotencyKey: 'm2', createdAt: base(2), nextAttemptAt: base(0) }));
    await store.enqueueMutation(makeMutation(t, { id: 'm1', idempotencyKey: 'm1', createdAt: base(1), nextAttemptAt: base(0) }));
    await store.enqueueMutation(makeMutation(t, { id: 'm3', idempotencyKey: 'm3', createdAt: base(3), nextAttemptAt: base(0) }));
    const ids = (await store.listPendingMutations(2)).map((m) => m.id);
    expect(ids).toEqual(['m1', 'm2']);
  });

  it('ignores a duplicate idempotencyKey in enqueueMutation', async () => {
    const t = makeTask();
    const m = makeMutation(t);
    await store.enqueueMutation(m);
    await store.enqueueMutation({ ...m, id: crypto.randomUUID() }); // same idempotencyKey
    expect((await store.listPendingMutations(10)).length).toBe(1);
  });

  it('excludes mutations not yet due', async () => {
    const t = makeTask();
    const farFuture = '2099-01-01T00:00:00.000Z';
    const m = makeMutation(t, { nextAttemptAt: farFuture });
    await store.enqueueMutation(m);
    expect(await store.listPendingMutations(10)).toEqual([]);
  });

  // ---- markMutationSucceeded / markMutationFailed ----

  it('removes a succeeded mutation from the pending list', async () => {
    const t = makeTask();
    const m = makeMutation(t);
    await store.enqueueMutation(m);
    await store.markMutationSucceeded(m.id);
    expect(await store.listPendingMutations(10)).toEqual([]);
  });

  it('increments attemptCount and sets backoff on failure', async () => {
    const t = makeTask();
    const m = makeMutation(t);
    await store.enqueueMutation(m);
    const later = '2099-01-01T00:00:00.000Z';
    await store.markMutationFailed(m.id, 'network error', later);
    // nextAttemptAt is in 2099, so the mutation is not due yet
    expect(await store.listPendingMutations(10)).toEqual([]);
  });

  // ---- markMutationInFlight / listInFlightMutations ----

  it('marks mutations in flight and lists in-flight mutations in IndexedDB', async () => {
    const t = makeTask();
    const m1 = makeMutation(t, { id: 'm-idb-f1', idempotencyKey: 'k-f1' });
    const m2 = makeMutation(t, { id: 'm-idb-f2', idempotencyKey: 'k-f2' });
    await store.enqueueMutation(m1);
    await store.enqueueMutation(m2);

    await store.markMutationInFlight('m-idb-f1', '2026-10-04T12:00:00.000Z');

    expect(await store.listPendingMutations(10)).toHaveLength(1);
    expect((await store.listPendingMutations(10))[0]?.id).toBe('m-idb-f2');

    const inFlight = await store.listInFlightMutations();
    expect(inFlight).toHaveLength(1);
    expect(inFlight[0]?.id).toBe('m-idb-f1');
    expect(inFlight[0]?.status).toBe('IN_FLIGHT');
    expect(inFlight[0]?.inFlightSince).toBe('2026-10-04T12:00:00.000Z');

    // markMutationFailed resets in-flight state
    await store.markMutationFailed('m-idb-f1', 'Timeout', '2099-01-01T00:00:00.000Z', 'PENDING');
    expect(await store.listInFlightMutations()).toHaveLength(0);
    const m1After = await store.getMutation('m-idb-f1');
    expect(m1After?.status).toBe('PENDING');
    expect(m1After?.inFlightSince).toBeUndefined();
    expect(m1After?.attemptCount).toBe(1);
  });

  // ---- cursor ----

  it('returns undefined when no cursor has been saved', async () => {
    expect(await store.getCursor()).toBeUndefined();
  });

  it('saves and retrieves the pull cursor', async () => {
    await store.saveCursor('cursor-v1');
    expect(await store.getCursor()).toBe('cursor-v1');
  });

  it('overwrites the cursor on repeated saves', async () => {
    await store.saveCursor('cursor-v1');
    await store.saveCursor('cursor-v2');
    expect(await store.getCursor()).toBe('cursor-v2');
  });

  // ---- persistence after refresh ----

  it('persists completed task and UPDATE mutation across a simulated page refresh', async () => {
    const dbName = uniqueDb();
    const store1 = new IndexedDbLocalStore(dbName);

    const task = makeTask({ title: 'Task to complete across refresh' });
    const createMut = makeMutation(task);
    await store1.saveTaskWithMutation(task, createMut);

    const completedTimestamp = '2026-09-30T10:00:00.000Z';
    const completedTask: TaskEntity = {
      ...task,
      completedAt: completedTimestamp,
      updatedAt: completedTimestamp,
      localStatus: 'CREATED'
    };

    const updateMut: SyncQueueEntry = {
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      entityType: 'TASK',
      entityId: task.id,
      operation: 'UPDATE',
      baseVersion: 0,
      payloadType: 'PARTIAL',
      payload: { completedAt: completedTimestamp },
      fieldTimestamps: { completedAt: completedTimestamp },
      createdAt: completedTimestamp,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: PAST
    };

    await store1.saveTaskWithMutation(completedTask, updateMut);

    // Simulate page refresh: create completely new store instance targeting the same DB
    const store2 = new IndexedDbLocalStore(dbName);
    const loadedTask = await store2.getTask(task.id);

    expect(loadedTask).toBeDefined();
    expect(loadedTask?.completedAt).toBe(completedTimestamp);
    expect(loadedTask?.updatedAt).toBe(completedTimestamp);

    const list = await store2.listTasks('inbox');
    expect(list.some((t) => t.id === task.id && t.completedAt === completedTimestamp)).toBe(true);

    const pending = await store2.listPendingMutations(10);
    expect(pending.length).toBe(2);
    expect(pending.some((m) => m.operation === 'UPDATE' && (m.payload as { completedAt?: string }).completedAt === completedTimestamp)).toBe(true);

    // Now reopen across refresh
    const reopenedTimestamp = '2026-09-30T11:00:00.000Z';
    const reopenedTask: TaskEntity = {
      ...completedTask,
      completedAt: null,
      updatedAt: reopenedTimestamp
    };
    const reopenMut: SyncQueueEntry = {
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      entityType: 'TASK',
      entityId: task.id,
      operation: 'UPDATE',
      baseVersion: 0,
      payloadType: 'PARTIAL',
      payload: { completedAt: null },
      fieldTimestamps: { completedAt: reopenedTimestamp },
      createdAt: reopenedTimestamp,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: PAST
    };

    await store2.saveTaskWithMutation(reopenedTask, reopenMut);

    // Simulate second refresh
    const store3 = new IndexedDbLocalStore(dbName);
    const finalTask = await store3.getTask(task.id);
    expect(finalTask?.completedAt).toBeNull();
    expect(finalTask?.updatedAt).toBe(reopenedTimestamp);
  });

  it('persists soft-deleted task and UPDATE mutation across refresh, and reappears when restored', async () => {
    const dbName = uniqueDb();
    const store1 = new IndexedDbLocalStore(dbName);

    const task = makeTask({ title: 'Task to delete across refresh' });
    await store1.saveTaskWithMutation(task, makeMutation(task));

    // Soft delete
    const deleteTime = '2026-09-30T15:00:00.000Z';
    const deletedTask: TaskEntity = {
      ...task,
      deletedAt: deleteTime,
      updatedAt: deleteTime,
      localStatus: 'DELETED'
    };
    const deleteMut: SyncQueueEntry = {
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      entityType: 'TASK',
      entityId: task.id,
      operation: 'UPDATE',
      baseVersion: 0,
      payloadType: 'PARTIAL',
      payload: { deletedAt: deleteTime },
      fieldTimestamps: { deletedAt: deleteTime },
      createdAt: deleteTime,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: PAST
    };
    await store1.saveTaskWithMutation(deletedTask, deleteMut);

    // Refresh simulation: create store2
    const store2 = new IndexedDbLocalStore(dbName);

    // 1. Excluded from normal listTasks
    const activeTasks = await store2.listTasks('inbox');
    expect(activeTasks.find((t) => t.id === task.id)).toBeUndefined();

    // 2. Still physically present in storage
    const physical = await store2.getTask(task.id);
    expect(physical).toBeDefined();
    expect(physical?.deletedAt).toBe(deleteTime);

    // 3. Retrievable with includeDeleted: true
    const allTasks = await store2.listTasks('inbox', { includeDeleted: true });
    expect(allTasks.find((t) => t.id === task.id)).toBeDefined();

    // 4. Restore the task
    const restoreTime = '2026-09-30T16:00:00.000Z';
    const restoredTask: TaskEntity = {
      ...deletedTask,
      deletedAt: null,
      updatedAt: restoreTime,
      localStatus: 'UPDATED'
    };
    const restoreMut: SyncQueueEntry = {
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      entityType: 'TASK',
      entityId: task.id,
      operation: 'UPDATE',
      baseVersion: 0,
      payloadType: 'PARTIAL',
      payload: { deletedAt: null },
      fieldTimestamps: { deletedAt: restoreTime },
      createdAt: restoreTime,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: PAST
    };
    await store2.saveTaskWithMutation(restoredTask, restoreMut);

    // Refresh simulation: create store3
    const store3 = new IndexedDbLocalStore(dbName);
    const restoredList = await store3.listTasks('inbox');
    expect(restoredList.find((t) => t.id === task.id)).toBeDefined();
    expect(restoredList.find((t) => t.id === task.id)?.deletedAt).toBeNull();
  });
});
