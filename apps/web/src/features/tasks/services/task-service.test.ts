import { describe, expect, it } from 'vitest';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import {
  INBOX_PROJECT_ID,
  TaskValidationError,
  createTask,
  type CreateTaskInput
} from './task-service';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeStore() {
  return new MemoryLocalStore();
}

const FIXED_TIME = '2020-01-01T10:00:00.000Z'; // deliberately in the past so nextAttemptAt is always due
const FIXED_TASK_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FIXED_MUT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let idCallCount = 0;
function fixedIds() {
  idCallCount = 0;
  return () => {
    idCallCount += 1;
    return idCallCount === 1 ? FIXED_TASK_ID : FIXED_MUT_ID;
  };
}

/** Shorthand for the common test case: fixed ids, time, timezone. */
async function create(input: CreateTaskInput) {
  const store = makeStore();
  const task = await createTask(input, {
    store,
    userId: 'user-1',
    newId: fixedIds(),
    now: () => new Date(FIXED_TIME),
    timeZone: 'Asia/Tehran'
  });
  return { task, store };
}

describe('createTask', () => {
  // ---- Valid TASK creation ----

  it('creates a TaskEntity with kind TASK', async () => {
    const { task } = await create({ title: 'Buy groceries' });
    expect(task.kind).toBe('TASK');
  });

  it('trims the title', async () => {
    const { task } = await create({ title: '  Buy groceries  ' });
    expect(task.title).toBe('Buy groceries');
  });

  it('defaults projectId to INBOX_PROJECT_ID', async () => {
    const { task } = await create({ title: 'Task' });
    expect(task.projectId).toBe(INBOX_PROJECT_ID);
  });

  it('defaults priority to 0', async () => {
    const { task } = await create({ title: 'Task' });
    expect(task.priority).toBe(0);
  });

  it('sets localStatus to CREATED', async () => {
    const { task } = await create({ title: 'Task' });
    expect(task.localStatus).toBe('CREATED');
  });

  it('sets the provided userId', async () => {
    const store = makeStore();
    const task = await createTask(
      { title: 'Task' },
      { store, userId: 'user-42', newId: fixedIds(), now: () => new Date(FIXED_TIME), timeZone: 'UTC' }
    );
    expect(task.userId).toBe('user-42');
  });

  it('generates UUIDv4 for the task id', async () => {
    const store = makeStore();
    const task = await createTask(
      { title: 'Task' },
      { store, userId: 'user-1', timeZone: 'UTC' }
    );
    expect(UUID_V4.test(task.id)).toBe(true);
  });

  it('sets createdAt and updatedAt to the same ISO 8601 timestamp', async () => {
    const { task } = await create({ title: 'Task' });
    expect(task.createdAt).toBe(FIXED_TIME);
    expect(task.updatedAt).toBe(FIXED_TIME);
    expect(task.createdAt).toBe(task.updatedAt);
  });

  it('sets the given IANA timeZone', async () => {
    const { task } = await create({ title: 'Task' });
    expect(task.timeZone).toBe('Asia/Tehran');
  });

  it('does not set deletedAt on a new task', async () => {
    const { task } = await create({ title: 'Task' });
    expect(task.deletedAt).toBeUndefined();
  });

  it('sets version to 0 (server version unknown at creation)', async () => {
    const { task } = await create({ title: 'Task' });
    expect(task.version).toBe(0);
  });

  // ---- Atomic persistence ----

  it('persists the task in the store after creation', async () => {
    const { task, store } = await create({ title: 'Persisted task' });
    expect(await store.getTask(task.id)).toBeDefined();
  });

  it('persists exactly one CREATE mutation in the queue', async () => {
    const { store } = await create({ title: 'Task' });
    const pending = await store.listPendingMutations(10);
    expect(pending.length).toBe(1);
    expect(pending[0]?.operation).toBe('CREATE');
    expect(pending[0]?.entityType).toBe('TASK');
  });

  it('uses the task id as the mutation idempotencyKey', async () => {
    const { task, store } = await create({ title: 'Task' });
    const pending = await store.listPendingMutations(10);
    expect(pending[0]?.idempotencyKey).toBe(task.id);
  });

  it('a simulated retry with the same idempotencyKey does not duplicate the mutation', async () => {
    const store = makeStore();
    const ids = fixedIds();
    const deps = { store, userId: 'user-1', newId: ids, now: () => new Date(FIXED_TIME), timeZone: 'UTC' };
    await createTask({ title: 'Task' }, deps);

    // Reset id generator but keep same task id to simulate retry
    idCallCount = 0;
    await createTask({ title: 'Task' }, { ...deps, newId: fixedIds() });

    const pending = await store.listPendingMutations(10);
    // Mutation should appear only once due to idempotencyKey = taskId dedup
    expect(pending.length).toBe(1);
  });

  it('mutation payload is FULL and contains the task', async () => {
    const { task, store } = await create({ title: 'Task payload' });
    const pending = await store.listPendingMutations(10);
    expect(pending[0]?.payloadType).toBe('FULL');
    expect((pending[0]?.payload as { title?: string }).title).toBe(task.title);
  });

  // ---- Validation ----

  it('throws TaskValidationError for an empty title', async () => {
    const store = makeStore();
    await expect(
      createTask({ title: '' }, { store, userId: 'user-1', timeZone: 'UTC' })
    ).rejects.toThrow(TaskValidationError);
  });

  it('throws TaskValidationError for a whitespace-only title', async () => {
    const store = makeStore();
    await expect(
      createTask({ title: '   ' }, { store, userId: 'user-1', timeZone: 'UTC' })
    ).rejects.toThrow(TaskValidationError);
  });

  it('does NOT persist anything when the title is invalid', async () => {
    const store = makeStore();
    try {
      await createTask({ title: '' }, { store, userId: 'user-1', timeZone: 'UTC' });
    } catch {
      // expected
    }
    expect(await store.listTasks(INBOX_PROJECT_ID)).toEqual([]);
    expect(await store.listPendingMutations(10)).toEqual([]);
  });
});
