import { beforeEach, describe, expect, it } from 'vitest';
import type { SyncQueueEntry, TaskEntity } from '@orbit/shared-types';
import { FakeSyncTransport, HttpSyncError, SyncRuntime } from '@orbit/sync-engine';
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

describe('Crash, Timeout and Restart Recovery (P3-SYNC-003)', () => {
  let store: MemoryLocalStore;
  let transport: FakeSyncTransport;
  let runtime: SyncRuntime;
  let currentTime: Date;

  beforeEach(() => {
    currentTime = new Date('2026-10-04T10:00:00.000Z');
    store = new MemoryLocalStore(() => currentTime);
    transport = new FakeSyncTransport();
    runtime = new SyncRuntime(store, transport, {
      now: () => currentTime,
      retryDelayMs: 1000,
      inFlightTimeoutMs: 30000,
      maxAttempts: 5
    });
  });

  // =========================================================================
  // 1. IN_FLIGHT mutation recovery
  // =========================================================================
  it('recovers mutations stuck in IN_FLIGHT after timeout', async () => {
    const task = makeTask({ id: 't-stuck' });
    const mut = makeMutation(task, { id: 'm-stuck', status: 'PENDING' });
    await store.enqueueMutation(mut);

    // Simulate push starting and putting mutation in flight
    const inFlightTime = currentTime.toISOString();
    await store.markMutationInFlight('m-stuck', inFlightTime);

    const entryInFlight = await store.getMutation('m-stuck');
    expect(entryInFlight?.status).toBe('IN_FLIGHT');
    expect(entryInFlight?.inFlightSince).toBe(inFlightTime);

    // Before timeout (5s elapsed, timeout is 30s)
    currentTime = new Date(currentTime.getTime() + 5000);
    const earlyRecovery = await runtime.recoverInFlightMutations();
    expect(earlyRecovery.recoveredCount).toBe(0);
    expect(earlyRecovery.unaffectedCount).toBe(1);

    // After timeout (35s elapsed >= 30s timeout)
    currentTime = new Date(currentTime.getTime() + 30000);
    const recoveryResult = await runtime.recoverInFlightMutations();
    expect(recoveryResult.recoveredCount).toBe(1);
    expect(recoveryResult.unaffectedCount).toBe(0);

    const entryRecovered = await store.getMutation('m-stuck');
    expect(entryRecovered?.status).toBe('PENDING');
    expect(entryRecovered?.attemptCount).toBe(1);
    expect(entryRecovered?.inFlightSince).toBeUndefined();
  });

  // =========================================================================
  // 2. Timeout to PENDING transition
  // =========================================================================
  it('returns timed-out mutations to PENDING safely with future nextAttemptAt', async () => {
    const task = makeTask({ id: 't-timeout' });
    const mut = makeMutation(task, { id: 'm-timeout' });
    await store.enqueueMutation(mut);

    await store.markMutationInFlight('m-timeout', currentTime.toISOString());

    // Advance time past in-flight timeout
    currentTime = new Date(currentTime.getTime() + 35000);
    const res = await runtime.recoverInFlightMutations();
    expect(res.recoveredCount).toBe(1);

    const entry = await store.getMutation('m-timeout');
    expect(entry?.status).toBe('PENDING');
    expect(entry?.attemptCount).toBe(1);

    // nextAttemptAt is scheduled in future (currentTime + backoff)
    const nextAttemptMs = Date.parse(entry!.nextAttemptAt);
    expect(nextAttemptMs).toBeGreaterThan(currentTime.getTime());

    // Not yet due for push
    expect(await store.listPendingMutations(10)).toHaveLength(0);

    // Advance time past nextAttemptAt: now due
    currentTime = new Date(nextAttemptMs);
    const due = await store.listPendingMutations(10);
    expect(due).toHaveLength(1);
    expect(due[0]?.id).toBe('m-timeout');
  });

  // =========================================================================
  // 3. Retry limit reached
  // =========================================================================
  it('transitions to FAILED when retry limit (maxAttempts) is reached', async () => {
    const task = makeTask({ id: 't-limit' });
    // Already attempted 4 times, with maxAttempts = 5, the 5th failure reaches the limit
    const mut = makeMutation(task, { id: 'm-limit', attemptCount: 4 });
    await store.enqueueMutation(mut);

    await store.markMutationInFlight('m-limit', currentTime.toISOString());

    // Advance past timeout
    currentTime = new Date(currentTime.getTime() + 35000);
    const res = await runtime.recoverInFlightMutations();
    expect(res.failedCount).toBe(1);
    expect(res.recoveredCount).toBe(0);

    const entry = await store.getMutation('m-limit');
    expect(entry?.status).toBe('FAILED');
    expect(entry?.attemptCount).toBe(5);
    expect(entry?.lastError).toContain('maximum retry attempts');

    // FAILED mutation is never returned in listPendingMutations
    expect(await store.listPendingMutations(10)).toHaveLength(0);

    // Subsequent pushes will not retry it
    const pushRes = await runtime.pushOnce();
    expect(pushRes.pushedCount).toBe(0);
  });

  it('transitions to FAILED when transport returns RETRYABLE_ERROR and retry limit reached', async () => {
    const task = makeTask({ id: 't-limit-retryable' });
    const mut = makeMutation(task, { id: 'm-limit-ret', attemptCount: 4 });
    await store.enqueueMutation(mut);

    transport.forcedPushStatuses.set('m-limit-ret', 'RETRYABLE_ERROR');
    transport.forcedPushErrors.set('m-limit-ret', 'Server overloaded');

    const result = await runtime.pushOnce();
    expect(result.rejectedCount).toBe(1);
    expect(result.retryableCount).toBe(0);

    const entry = await store.getMutation('m-limit-ret');
    expect(entry?.status).toBe('FAILED');
    expect(entry?.attemptCount).toBe(5);
  });

  // =========================================================================
  // 4. Permanent rejection remains FAILED
  // =========================================================================
  it('permanent rejection remains FAILED across recovery cycles and time progression', async () => {
    const task = makeTask({ id: 't-rejected-perm' });
    const mut = makeMutation(task, { id: 'm-perm-fail' });
    await store.enqueueMutation(mut);

    transport.forcedPushStatuses.set('m-perm-fail', 'REJECTED');
    transport.forcedPushErrors.set('m-perm-fail', 'Tombstone cleaned: cannot resurrect');

    const pushResult = await runtime.pushOnce();
    expect(pushResult.rejectedCount).toBe(1);

    const entry = await store.getMutation('m-perm-fail');
    expect(entry?.status).toBe('FAILED');
    expect(entry?.lastError).toBe('Tombstone cleaned: cannot resurrect');

    // Advance time significantly and execute multiple recovery passes
    currentTime = new Date(currentTime.getTime() + 100000);
    const rec1 = await runtime.recoverInFlightMutations();
    expect(rec1.recoveredCount).toBe(0);
    expect(rec1.failedCount).toBe(0);

    const rec2 = await runtime.recoverInFlightMutations({ force: true });
    expect(rec2.recoveredCount).toBe(0);

    const entryAfter = await store.getMutation('m-perm-fail');
    expect(entryAfter?.status).toBe('FAILED');
    expect(await store.listPendingMutations(10)).toHaveLength(0);
  });

  // =========================================================================
  // 5. Repeated recovery is idempotent
  // =========================================================================
  it('repeated recovery is idempotent and creates no duplicate mutations', async () => {
    const task = makeTask({ id: 't-idemp' });
    const mut = makeMutation(task, { id: 'm-idemp' });
    await store.enqueueMutation(mut);
    await store.markMutationInFlight('m-idemp', currentTime.toISOString());

    currentTime = new Date(currentTime.getTime() + 35000);

    // Pass 1
    const firstRec = await runtime.recoverInFlightMutations();
    expect(firstRec.recoveredCount).toBe(1);

    const entryAfterFirst = await store.getMutation('m-idemp');
    expect(entryAfterFirst?.status).toBe('PENDING');
    expect(entryAfterFirst?.attemptCount).toBe(1);

    // Pass 2 immediately after
    const secondRec = await runtime.recoverInFlightMutations();
    expect(secondRec.recoveredCount).toBe(0);
    expect(secondRec.failedCount).toBe(0);

    // Pass 3 with force flag
    const thirdRec = await runtime.recoverInFlightMutations({ force: true });
    expect(thirdRec.recoveredCount).toBe(0);

    const entryAfterThird = await store.getMutation('m-idemp');
    expect(entryAfterThird?.status).toBe('PENDING');
    expect(entryAfterThird?.attemptCount).toBe(1);
    expect(entryAfterThird?.nextAttemptAt).toBe(entryAfterFirst?.nextAttemptAt);
  });

  // =========================================================================
  // 6. Crash before cursor commit
  // =========================================================================
  it('crash before cursor commit: preserves cursor when pull persistence fails', async () => {
    const taskA = makeTask({ id: 't-crash-a', title: 'Task A' });
    const taskB = makeTask({ id: 't-crash-b', title: 'Task B' });
    transport.addServerTask(taskA);
    transport.addServerTask(taskB);

    await store.saveCursor('c_initial_pos');

    // Simulate crash while saving task B
    let saves = 0;
    const originalSave = store.saveTask.bind(store);
    store.saveTask = async (task: TaskEntity) => {
      saves++;
      if (saves === 2) {
        throw new Error('Simulated crash during task persistence');
      }
      return originalSave(task);
    };

    await expect(runtime.pullOnce()).rejects.toThrow('Simulated crash during task persistence');

    // Cursor must NOT have advanced
    expect(await store.getCursor()).toBe('c_initial_pos');

    // Restore saveTask and retry: pull succeeds and commits new cursor
    store.saveTask = originalSave;
    const retryResult = await runtime.pullOnce();
    expect(retryResult.appliedCount).toBe(2);
    expect(retryResult.nextCursor).toBe('c_2');
    expect(await store.getCursor()).toBe('c_2');
  });

  // =========================================================================
  // 7. Crash after entity persistence but before cursor persistence
  // =========================================================================
  it('crash after entity persistence but before cursor persistence: preserves cursor and re-pull is idempotent', async () => {
    const task1 = makeTask({ id: 't-persist-1', title: 'Task 1' });
    const task2 = makeTask({ id: 't-persist-2', title: 'Task 2' });
    transport.addServerTask(task1);
    const c2 = transport.addServerTask(task2);

    await store.saveCursor('c_steady');

    // Simulate crash after all saveTask calls succeed, right inside saveCursor
    const originalSaveCursor = store.saveCursor.bind(store);
    let cursorCalls = 0;
    store.saveCursor = async (cursor: string) => {
      cursorCalls++;
      if (cursorCalls === 1) {
        throw new Error('Simulated crash during cursor commit');
      }
      return originalSaveCursor(cursor);
    };

    await expect(runtime.pullOnce()).rejects.toThrow('Simulated crash during cursor commit');

    // Tasks were already persisted
    expect(await store.getTask('t-persist-1')).toBeDefined();
    expect(await store.getTask('t-persist-2')).toBeDefined();

    // But cursor remains at c_steady!
    expect(await store.getCursor()).toBe('c_steady');

    // On subsequent pull, changes are pulled from c_steady, re-applied idempotently, and cursor is committed
    const retryPull = await runtime.pullOnce();
    expect(retryPull.nextCursor).toBe(c2);
    expect(await store.getCursor()).toBe(c2);
    expect((await store.getTask('t-persist-1'))?.title).toBe('Task 1');
  });

  // =========================================================================
  // 8. Retry after server timeout
  // =========================================================================
  it('retry after server timeout: schedules backoff and succeeds on subsequent push', async () => {
    const task = makeTask({ id: 't-srv-timeout', title: 'Timeout Task' });
    const mut = makeMutation(task, { id: 'm-srv-timeout' });
    await store.enqueueMutation(mut);

    // Simulate transport timeout
    let pushAttempts = 0;
    const originalPush = transport.push.bind(transport);
    transport.push = async (mutations) => {
      pushAttempts++;
      if (pushAttempts === 1) {
        throw new HttpSyncError('Request timeout after 15000ms', 504, true);
      }
      return originalPush(mutations);
    };

    // 1st push fails due to server timeout
    await expect(runtime.pushOnce()).rejects.toThrow('Request timeout');

    const entryAfterTimeout = await store.getMutation('m-srv-timeout');
    expect(entryAfterTimeout?.status).toBe('PENDING');
    expect(entryAfterTimeout?.attemptCount).toBe(1);
    expect(entryAfterTimeout?.lastError).toContain('Request timeout');

    // Advance time past nextAttemptAt
    currentTime = new Date(Date.parse(entryAfterTimeout!.nextAttemptAt));

    // 2nd push succeeds
    const retryResult = await runtime.pushOnce();
    expect(retryResult.succeededCount).toBe(1);

    const entrySucceeded = await store.getMutation('m-srv-timeout');
    expect(entrySucceeded?.status).toBe('SUCCEEDED');
    expect(transport.getServerTask('t-srv-timeout')?.title).toBe('Timeout Task');
  });

  // =========================================================================
  // 9. Duplicate push after restart
  // =========================================================================
  it('duplicate push after restart: server returns ALREADY_APPLIED and client marks SUCCEEDED without duplicates', async () => {
    const task = makeTask({ id: 't-restart', title: 'Restart Task' });
    const mut = makeMutation(task, {
      id: 'm-restart',
      idempotencyKey: 'idem-restart-key-1'
    });
    await store.enqueueMutation(mut);

    // Server already received and committed the mutation, but client process crashed before receiving 200 OK
    transport.addServerTask(task);
    const directServerPush = await transport.push([mut]);
    expect(directServerPush[0]?.status).toBe('APPLIED');

    // Local mutation was left in IN_FLIGHT
    await store.markMutationInFlight('m-restart', currentTime.toISOString());

    // Process restarts! Recovery runs:
    await runtime.recoverInFlightMutations({ force: true });
    const entryRecovered = await store.getMutation('m-restart');
    expect(entryRecovered?.status).toBe('PENDING');

    // Advance time to allow push
    currentTime = new Date(Date.parse(entryRecovered!.nextAttemptAt));

    // Pushed again: server returns ALREADY_APPLIED
    const restartPushResult = await runtime.pushOnce();
    expect(restartPushResult.succeededCount).toBe(1);

    const finalEntry = await store.getMutation('m-restart');
    expect(finalEntry?.status).toBe('SUCCEEDED');

    // No duplicate tasks on server
    const serverTasks = transport.getAllServerTasks().filter((t) => t.id === 't-restart');
    expect(serverTasks).toHaveLength(1);
  });

  // =========================================================================
  // 10. IndexedDB browser reload / process restart persistence
  // =========================================================================
  it('recovers correctly after browser reload with persistent IndexedDB storage', async () => {
    const testDbName = `test-idb-reload-${crypto.randomUUID()}`;
    let simTime = new Date('2026-10-04T12:00:00.000Z');

    // Browser session 1: Task and mutation created, push initiated (IN_FLIGHT), then tab reloads
    const storeSession1 = new IndexedDbLocalStore(testDbName, () => simTime);
    const transport1 = new FakeSyncTransport();
    const _runtimeSession1 = new SyncRuntime(storeSession1, transport1, {
      now: () => simTime,
      inFlightTimeoutMs: 10000
    });

    const task = makeTask({ id: 'idb-reload-task', title: 'Reload Task' });
    const mut = makeMutation(task, { id: 'm-idb-reload' });
    await storeSession1.saveTaskWithMutation(task, mut);
    await storeSession1.markMutationInFlight('m-idb-reload', simTime.toISOString());

    // Verify it is IN_FLIGHT in IndexedDB
    expect((await storeSession1.getMutation('m-idb-reload'))?.status).toBe('IN_FLIGHT');

    // Tab reloads / process restarts: New instances connecting to the same DB name
    simTime = new Date(simTime.getTime() + 15000); // 15s later (> 10s timeout)
    const storeSession2 = new IndexedDbLocalStore(testDbName, () => simTime);
    const transport2 = new FakeSyncTransport();
    const runtimeSession2 = new SyncRuntime(storeSession2, transport2, {
      now: () => simTime,
      inFlightTimeoutMs: 10000
    });

    // Run recovery on start
    const recResult = await runtimeSession2.recoverInFlightMutations();
    expect(recResult.recoveredCount).toBe(1);

    const recoveredInDb = await storeSession2.getMutation('m-idb-reload');
    expect(recoveredInDb?.status).toBe('PENDING');

    // Advance past backoff and push
    simTime = new Date(Date.parse(recoveredInDb!.nextAttemptAt));
    const pushResult = await runtimeSession2.pushOnce();
    expect(pushResult.succeededCount).toBe(1);

    const succeededInDb = await storeSession2.getMutation('m-idb-reload');
    expect(succeededInDb?.status).toBe('SUCCEEDED');
    expect(transport2.getServerTask('idb-reload-task')?.title).toBe('Reload Task');
  });
});
