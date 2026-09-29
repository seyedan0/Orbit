import { beforeEach, describe, expect, it } from 'vitest';
import type { SyncQueueEntry, TaskEntity } from '@orbit/shared-types';
import { FakeSyncTransport, SyncRuntime } from '@orbit/sync-engine';
import { IndexedDbLocalStore } from '../storage/indexeddb-local-store.js';
import { MemoryLocalStore } from '../storage/memory-local-store.js';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  const PAST = '2026-01-01T00:00:00.000Z';
  return {
    id: overrides.id ?? 'task-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: overrides.title ?? 'Test task',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    timeZone: 'UTC',
    reminders: [],
    items: [],
    version: 1,
    localStatus: 'CREATED',
    createdAt: overrides.createdAt ?? PAST,
    updatedAt: overrides.updatedAt ?? PAST,
    ...overrides
  };
}

function makeMutation(task: TaskEntity, overrides: Partial<SyncQueueEntry> = {}): SyncQueueEntry {
  return {
    id: overrides.id ?? `mut-${task.id}`,
    idempotencyKey: overrides.idempotencyKey ?? `key-${task.id}`,
    entityType: 'TASK',
    entityId: task.id,
    operation: overrides.operation ?? 'CREATE',
    baseVersion: task.version,
    payloadType: 'FULL',
    payload: task,
    fieldTimestamps: { title: task.createdAt },
    createdAt: overrides.createdAt ?? task.createdAt,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: overrides.nextAttemptAt ?? '2020-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('SyncRuntime with FakeSyncTransport', () => {
  let store: MemoryLocalStore;
  let transport: FakeSyncTransport;
  let runtime: SyncRuntime;
  let currentTime: Date;

  beforeEach(() => {
    currentTime = new Date('2026-09-30T10:00:00.000Z');
    store = new MemoryLocalStore(() => currentTime);
    transport = new FakeSyncTransport();
    runtime = new SyncRuntime(store, transport, {
      now: () => currentTime,
      retryDelayMs: 2000
    });
  });

  // ==========================================
  // 1. Pull requirements
  // ==========================================

  it('pull stores changes and cursor', async () => {
    const taskA = makeTask({ id: 'task-a', title: 'Remote Task A' });
    const taskB = makeTask({ id: 'task-b', title: 'Remote Task B' });
    transport.addServerTask(taskA);
    const cursorB = transport.addServerTask(taskB);

    expect(await store.getCursor()).toBeUndefined();
    expect(await store.getTask('task-a')).toBeUndefined();
    expect(await store.getTask('task-b')).toBeUndefined();

    const result = await runtime.pullOnce();

    expect(result.appliedCount).toBe(2);
    expect(result.nextCursor).toBe(cursorB);
    expect(await store.getCursor()).toBe(cursorB);

    const savedA = await store.getTask('task-a');
    const savedB = await store.getTask('task-b');
    expect(savedA?.title).toBe('Remote Task A');
    expect(savedB?.title).toBe('Remote Task B');
  });

  it('cursor does not advance after failed persistence', async () => {
    const taskA = makeTask({ id: 'task-a', title: 'Remote Task A' });
    const taskB = makeTask({ id: 'task-b', title: 'Remote Task B' });
    transport.addServerTask(taskA);
    transport.addServerTask(taskB);

    // Save initial cursor
    await store.saveCursor('c_initial');

    // Simulate failure during task persistence
    let saveCount = 0;
    const originalSave = store.saveTask.bind(store);
    store.saveTask = async (task: TaskEntity) => {
      saveCount++;
      if (saveCount === 2) {
        throw new Error('Disk write failure on task B');
      }
      return originalSave(task);
    };

    await expect(runtime.pullOnce()).rejects.toThrow('Disk write failure on task B');

    // Cursor must NOT have advanced
    expect(await store.getCursor()).toBe('c_initial');
  });

  // ==========================================
  // 2. Push & FIFO ordering
  // ==========================================

  it('push sends pending mutations in FIFO order', async () => {
    // Enqueue 3 mutations with distinct createdAt timestamps
    const task1 = makeTask({ id: 'task-1', title: 'Task 1' });
    const task2 = makeTask({ id: 'task-2', title: 'Task 2' });
    const task3 = makeTask({ id: 'task-3', title: 'Task 3' });

    // Intentionally enqueue in reverse to verify FIFO sorting by createdAt
    const mut3 = makeMutation(task3, { id: 'm3', createdAt: '2026-09-30T10:03:00.000Z' });
    const mut1 = makeMutation(task1, { id: 'm1', createdAt: '2026-09-30T10:01:00.000Z' });
    const mut2 = makeMutation(task2, { id: 'm2', createdAt: '2026-09-30T10:02:00.000Z' });

    await store.enqueueMutation(mut3);
    await store.enqueueMutation(mut1);
    await store.enqueueMutation(mut2);

    const result = await runtime.pushOnce();

    expect(result.pushedCount).toBe(3);
    expect(transport.pushedBatches.length).toBe(1);

    const pushedOrder = transport.pushedBatches[0]!.map((m) => m.id);
    expect(pushedOrder).toEqual(['m1', 'm2', 'm3']);
  });

  // ==========================================
  // 3. Status updates & Error handling
  // ==========================================

  it('successful mutation becomes SUCCEEDED', async () => {
    const task = makeTask({ id: 'task-success', title: 'Successful Task' });
    const mutation = makeMutation(task, { id: 'm-success' });
    await store.enqueueMutation(mutation);

    const entryBefore = await store.getMutation('m-success');
    expect(entryBefore?.status).toBe('PENDING');

    const result = await runtime.pushOnce();

    expect(result.succeededCount).toBe(1);
    expect(result.rejectedCount).toBe(0);
    expect(result.retryableCount).toBe(0);

    const entryAfter = await store.getMutation('m-success');
    expect(entryAfter?.status).toBe('SUCCEEDED');

    // Succeeded mutation is excluded from subsequent pending lists
    const pending = await store.listPendingMutations(10);
    expect(pending).toHaveLength(0);
  });

  it('retryable error returns mutation to PENDING with nextAttemptAt in future', async () => {
    const task = makeTask({ id: 'task-retry', title: 'Retry Task' });
    const mutation = makeMutation(task, { id: 'm-retry' });
    await store.enqueueMutation(mutation);

    // Force RETRYABLE_ERROR from transport
    transport.forcedPushStatuses.set('m-retry', 'RETRYABLE_ERROR');
    transport.forcedPushErrors.set('m-retry', 'Service temporarily overloaded');

    const result = await runtime.pushOnce();

    expect(result.retryableCount).toBe(1);
    expect(result.succeededCount).toBe(0);

    const entry = await store.getMutation('m-retry');
    expect(entry?.status).toBe('PENDING');
    expect(entry?.attemptCount).toBe(1);
    expect(entry?.lastError).toBe('Service temporarily overloaded');

    // nextAttemptAt is in future (currentTime + 2000ms retryDelay)
    const nextAttemptMs = Date.parse(entry!.nextAttemptAt);
    expect(nextAttemptMs).toBeGreaterThan(currentTime.getTime());

    // Not yet due, so listPendingMutations at currentTime is empty
    expect(await store.listPendingMutations(10)).toHaveLength(0);

    // Advance time past nextAttemptAt: now it is due again
    currentTime = new Date(nextAttemptMs);
    const pendingDue = await store.listPendingMutations(10);
    expect(pendingDue).toHaveLength(1);
    expect(pendingDue[0]?.id).toBe('m-retry');
  });

  it('rejected mutation is not retried automatically and marked FAILED', async () => {
    const task = makeTask({ id: 'task-rejected', title: 'Rejected Task' });
    const mutation = makeMutation(task, { id: 'm-rejected' });
    await store.enqueueMutation(mutation);

    // Force REJECTED from transport (e.g. invalid payload or schema violation)
    transport.forcedPushStatuses.set('m-rejected', 'REJECTED');
    transport.forcedPushErrors.set('m-rejected', 'Schema validation failed: title too long');

    const result = await runtime.pushOnce();

    expect(result.rejectedCount).toBe(1);
    expect(result.succeededCount).toBe(0);
    expect(result.retryableCount).toBe(0);

    const entry = await store.getMutation('m-rejected');
    expect(entry?.status).toBe('FAILED');
    expect(entry?.lastError).toBe('Schema validation failed: title too long');

    // Advance time significantly into the future
    currentTime = new Date('2099-01-01T00:00:00.000Z');

    // Rejected mutation is NOT returned in pending list and NOT retried automatically
    expect(await store.listPendingMutations(10)).toHaveLength(0);

    const secondPush = await runtime.pushOnce();
    expect(secondPush.pushedCount).toBe(0);
    expect(transport.pushedBatches).toHaveLength(1); // No second batch pushed
  });

  // ==========================================
  // 4. Idempotency
  // ==========================================

  it('duplicate push is idempotent', async () => {
    const task = makeTask({ id: 'task-idem', title: 'Idempotent Task' });
    const mutation = makeMutation(task, { id: 'm-idem', idempotencyKey: 'idem-key-1' });

    // 1st Push: normal apply
    await store.enqueueMutation(mutation);
    const firstPush = await runtime.pushOnce();
    expect(firstPush.succeededCount).toBe(1);

    // Simulate same mutation being re-enqueued or duplicate push with same idempotencyKey
    const duplicateMutation = makeMutation(task, {
      id: 'm-idem-dup',
      idempotencyKey: 'idem-key-1'
    });
    // Direct enqueue to simulate re-submission
    await store.enqueueMutation(duplicateMutation);

    // Because memory store skips identical idempotencyKey on enqueue, let's test transport directly:
    const transportResults = await transport.push([duplicateMutation]);
    expect(transportResults[0]?.status).toBe('ALREADY_APPLIED');

    // Server has exactly 1 copy of the task
    expect(transport.getAllServerTasks()).toHaveLength(1);
  });

  // ==========================================
  // 5. Complete sync cycle
  // ==========================================

  it('syncOnce executes pull then push in sequence', async () => {
    // Setup a remote task to pull
    transport.addServerTask(makeTask({ id: 'remote-1', title: 'Remote Item' }));

    // Setup a local task mutation to push
    const localTask = makeTask({ id: 'local-1', title: 'Local Item' });
    await store.enqueueMutation(makeMutation(localTask, { id: 'm-local-1' }));

    const syncResult = await runtime.syncOnce();

    expect(syncResult.pull.appliedCount).toBe(1);
    expect(syncResult.push.succeededCount).toBe(1);

    // Local store has both items
    expect(await store.getTask('remote-1')).toBeDefined();
    expect(await store.getTask('local-1')).toBeDefined();

    // Transport server state has both items
    expect(transport.getServerTask('remote-1')).toBeDefined();
    expect(transport.getServerTask('local-1')).toBeDefined();
  });

  it('handles batch-level transport failure by scheduling retry for all mutations', async () => {
    const task1 = makeTask({ id: 't-net-1' });
    const task2 = makeTask({ id: 't-net-2' });
    await store.enqueueMutation(makeMutation(task1, { id: 'm-net-1' }));
    await store.enqueueMutation(makeMutation(task2, { id: 'm-net-2' }));

    transport.simulateNetworkErrorOnPush = true;

    await expect(runtime.pushOnce()).rejects.toThrow('Simulated network error on push');

    const m1 = await store.getMutation('m-net-1');
    const m2 = await store.getMutation('m-net-2');

    expect(m1?.status).toBe('PENDING');
    expect(m2?.status).toBe('PENDING');
    expect(m1?.lastError).toBe('Simulated network error on push');
    expect(m2?.lastError).toBe('Simulated network error on push');
  });
});

describe('SyncRuntime with IndexedDbLocalStore', () => {
  let dbName: string;
  let idbStore: IndexedDbLocalStore;
  let transport: FakeSyncTransport;
  let runtime: SyncRuntime;

  beforeEach(() => {
    dbName = `test-sync-idb-${crypto.randomUUID()}`;
    idbStore = new IndexedDbLocalStore(dbName);
    transport = new FakeSyncTransport();
    runtime = new SyncRuntime(idbStore, transport);
  });

  it('pulls changes and commits cursor to IndexedDB', async () => {
    transport.addServerTask(makeTask({ id: 'idb-task-1', title: 'Remote Task 1' }));
    const c2 = transport.addServerTask(makeTask({ id: 'idb-task-2', title: 'Remote Task 2' }));

    const result = await runtime.pullOnce();

    expect(result.appliedCount).toBe(2);
    expect(result.nextCursor).toBe(c2);
    expect(await idbStore.getCursor()).toBe(c2);

    const tasks = await idbStore.listTasks('inbox');
    expect(tasks).toHaveLength(2);
  });

  it('pushes mutations from IndexedDB and marks them SUCCEEDED', async () => {
    const task = makeTask({ id: 'idb-local-task', title: 'IDB Local Task' });
    const mut = makeMutation(task, { id: 'm-idb-1' });

    await idbStore.saveTaskWithMutation(task, mut);
    expect(await idbStore.listPendingMutations(10)).toHaveLength(1);

    const result = await runtime.pushOnce();

    expect(result.succeededCount).toBe(1);
    expect(await idbStore.listPendingMutations(10)).toHaveLength(0);

    const entry = await idbStore.getMutation('m-idb-1');
    expect(entry?.status).toBe('SUCCEEDED');
    expect(transport.getServerTask('idb-local-task')?.title).toBe('IDB Local Task');
  });
});
