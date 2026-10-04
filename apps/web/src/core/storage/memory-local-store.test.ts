import type { SyncQueueEntry, TaskEntity } from '@orbit/shared-types';
import { describe, expect, it } from 'vitest';
import { MemoryLocalStore } from './memory-local-store';

const NOW = new Date('2026-09-29T12:00:00.000Z');

function task(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 'task-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'Write docs',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    timeZone: 'UTC',
    reminders: [],
    items: [],
    version: 0,
    localStatus: 'CREATED',
    createdAt: '2026-09-29T10:00:00.000Z',
    updatedAt: '2026-09-29T10:00:00.000Z',
    ...overrides
  };
}

function mutation(
  id: string,
  createdAt: string,
  overrides: Partial<SyncQueueEntry> = {}
): SyncQueueEntry {
  return {
    id,
    idempotencyKey: id,
    entityType: 'TASK',
    entityId: 'task-1',
    operation: 'UPDATE',
    baseVersion: 0,
    payloadType: 'PARTIAL',
    payload: { title: 'x' },
    fieldTimestamps: { title: createdAt },
    createdAt,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: '2026-09-29T00:00:00.000Z',
    ...overrides
  };
}

describe('MemoryLocalStore', () => {
  // ---- getTask / saveTask ----

  it('stores tasks by value so callers cannot mutate stored state', async () => {
    const store = new MemoryLocalStore(() => NOW);
    const original = task();
    await store.saveTask(original);
    original.title = 'changed outside';
    const loaded = await store.getTask('task-1');
    expect(loaded?.title).toBe('Write docs');
    if (loaded) loaded.title = 'changed after read';
    expect((await store.getTask('task-1'))?.title).toBe('Write docs');
  });

  it('returns undefined for unknown tasks', async () => {
    expect(await new MemoryLocalStore(() => NOW).getTask('missing')).toBeUndefined();
  });

  // ---- listTasks ----

  it('returns tasks for the requested projectId and excludes others', async () => {
    const store = new MemoryLocalStore(() => NOW);
    await store.saveTask(task({ id: 't1', projectId: 'inbox' }));
    await store.saveTask(task({ id: 't2', projectId: 'other' }));
    const list = await store.listTasks('inbox');
    expect(list.map((t) => t.id)).toEqual(['t1']);
  });

  it('excludes soft-deleted tasks from listTasks', async () => {
    const store = new MemoryLocalStore(() => NOW);
    await store.saveTask(task({ id: 't1', projectId: 'inbox' }));
    await store.saveTask(
      task({ id: 't2', projectId: 'inbox', deletedAt: '2026-09-29T11:00:00.000Z', localStatus: 'DELETED' })
    );
    const list = await store.listTasks('inbox');
    expect(list.map((t) => t.id)).toEqual(['t1']);
  });

  it('includes soft-deleted tasks when includeDeleted is true', async () => {
    const store = new MemoryLocalStore(() => NOW);
    await store.saveTask(task({ id: 't1', projectId: 'inbox' }));
    await store.saveTask(
      task({ id: 't2', projectId: 'inbox', deletedAt: '2026-09-29T11:00:00.000Z', localStatus: 'DELETED' })
    );
    const list = await store.listTasks('inbox', { includeDeleted: true });
    expect(list.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('returns empty array when no tasks exist for projectId', async () => {
    const store = new MemoryLocalStore(() => NOW);
    expect(await store.listTasks('inbox')).toEqual([]);
  });

  // ---- saveTaskWithMutation ----

  it('persists both task and mutation atomically', async () => {
    const store = new MemoryLocalStore(() => NOW);
    const t = task();
    const m = mutation('m1', '2026-09-29T10:00:01.000Z', {
      entityId: t.id,
      idempotencyKey: t.id,
      operation: 'CREATE'
    });
    await store.saveTaskWithMutation(t, m);
    expect(await store.getTask(t.id)).toBeDefined();
    expect((await store.listPendingMutations(10)).length).toBe(1);
  });

  it('skips the mutation on duplicate idempotencyKey but still writes the task', async () => {
    const store = new MemoryLocalStore(() => NOW);
    const t = task();
    const m = mutation('m1', '2026-09-29T10:00:01.000Z', {
      entityId: t.id,
      idempotencyKey: t.id,
      operation: 'CREATE'
    });
    await store.saveTaskWithMutation(t, m);
    // Retry with same idempotencyKey but different mutation id
    const m2 = { ...m, id: 'm1-retry' };
    await store.saveTaskWithMutation({ ...t, title: 'Updated' }, m2);
    // Task is updated, but only one mutation exists
    expect((await store.getTask(t.id))?.title).toBe('Updated');
    expect((await store.listPendingMutations(10)).length).toBe(1);
    expect((await store.listPendingMutations(10))[0]?.id).toBe('m1');
  });

  // ---- enqueueMutation ----

  it('lists pending mutations FIFO by createdAt and respects the limit', async () => {
    const store = new MemoryLocalStore(() => NOW);
    await store.enqueueMutation(mutation('m2', '2026-09-29T10:00:02.000Z'));
    await store.enqueueMutation(mutation('m1', '2026-09-29T10:00:01.000Z'));
    await store.enqueueMutation(mutation('m3', '2026-09-29T10:00:03.000Z'));
    const ids = (await store.listPendingMutations(2)).map((m) => m.id);
    expect(ids).toEqual(['m1', 'm2']);
  });

  it('ignores a duplicate idempotency key in enqueueMutation', async () => {
    const store = new MemoryLocalStore(() => NOW);
    await store.enqueueMutation(mutation('m1', '2026-09-29T10:00:01.000Z'));
    await store.enqueueMutation(
      mutation('m1-retry', '2026-09-29T10:00:02.000Z', { idempotencyKey: 'm1' })
    );
    expect((await store.listPendingMutations(10)).map((m) => m.id)).toEqual(['m1']);
  });

  it('excludes mutations not yet due or already succeeded', async () => {
    const store = new MemoryLocalStore(() => NOW);
    await store.enqueueMutation(mutation('due', '2026-09-29T10:00:01.000Z'));
    await store.enqueueMutation(
      mutation('later', '2026-09-29T10:00:02.000Z', {
        nextAttemptAt: '2026-09-29T13:00:00.000Z'
      })
    );
    await store.enqueueMutation(mutation('done', '2026-09-29T10:00:03.000Z'));
    await store.markMutationSucceeded('done');
    expect((await store.listPendingMutations(10)).map((m) => m.id)).toEqual(['due']);
  });

  it('records attempt count, error and backoff on failure', async () => {
    let now = NOW;
    const store = new MemoryLocalStore(() => now);
    await store.enqueueMutation(mutation('m1', '2026-09-29T10:00:01.000Z'));
    await store.markMutationFailed('m1', 'timeout', '2026-09-29T12:05:00.000Z');
    expect(await store.listPendingMutations(10)).toEqual([]);
    now = new Date('2026-09-29T12:05:00.000Z');
    const [retry] = await store.listPendingMutations(10);
    expect(retry).toMatchObject({ id: 'm1', attemptCount: 1, lastError: 'timeout' });
  });

  // ---- in-flight mutations ----

  it('marks mutations in flight and lists in-flight mutations', async () => {
    const store = new MemoryLocalStore(() => NOW);
    await store.enqueueMutation(mutation('m1', '2026-09-29T10:00:01.000Z'));
    await store.enqueueMutation(mutation('m2', '2026-09-29T10:00:02.000Z'));

    await store.markMutationInFlight('m1', '2026-09-29T10:05:00.000Z');

    expect(await store.listPendingMutations(10)).toHaveLength(1);
    expect((await store.listPendingMutations(10))[0]?.id).toBe('m2');

    const inFlight = await store.listInFlightMutations();
    expect(inFlight).toHaveLength(1);
    expect(inFlight[0]?.id).toBe('m1');
    expect(inFlight[0]?.status).toBe('IN_FLIGHT');
    expect(inFlight[0]?.inFlightSince).toBe('2026-09-29T10:05:00.000Z');

    // Succeeded clears in-flight state
    await store.markMutationSucceeded('m1');
    expect(await store.listInFlightMutations()).toHaveLength(0);
    const m1 = await store.getMutation('m1');
    expect(m1?.status).toBe('SUCCEEDED');
    expect(m1?.inFlightSince).toBeUndefined();
  });

  // ---- cursor ----

  it('persists the pull cursor', async () => {
    const store = new MemoryLocalStore(() => NOW);
    expect(await store.getCursor()).toBeUndefined();
    await store.saveCursor('c-42');
    expect(await store.getCursor()).toBe('c-42');
  });
});
