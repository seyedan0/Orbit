import { describe, expect, it } from 'vitest';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import {
  INBOX_PROJECT_ID,
  InvalidTaskKindError,
  TaskNotFoundError,
  TaskValidationError,
  createTask,
  completeTask,
  reopenTask,
  deleteTask,
  restoreTask,
  scheduleTask,
  rescheduleTask,
  isDueToday,
  isDueTomorrow,
  filterTasksDueToday,
  filterTasksDueTomorrow,
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

describe('completeTask', () => {
  const COMPLETE_TIME = '2020-01-01T12:00:00.000Z';
  const MUT_COMPLETE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  it('completes an uncompleted TASK item', async () => {
    const { task, store } = await create({ title: 'Task to complete' });
    const updated = await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(COMPLETE_TIME),
      newId: () => MUT_COMPLETE_ID
    });

    expect(updated.completedAt).toBe(COMPLETE_TIME);
    expect(updated.updatedAt).toBe(COMPLETE_TIME);
    expect(updated.createdAt).toBe(FIXED_TIME);
  });

  it('persists the completed task in the store', async () => {
    const { task, store } = await create({ title: 'Task to complete' });
    await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(COMPLETE_TIME),
      newId: () => MUT_COMPLETE_ID
    });

    const stored = await store.getTask(task.id);
    expect(stored?.completedAt).toBe(COMPLETE_TIME);
    expect(stored?.updatedAt).toBe(COMPLETE_TIME);
  });

  it('generates exactly one UPDATE mutation for the completion', async () => {
    const { task, store } = await create({ title: 'Task' });
    await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(COMPLETE_TIME),
      newId: () => MUT_COMPLETE_ID
    });

    const pending = await store.listPendingMutations(10);
    // 1 CREATE + 1 UPDATE = 2 total
    expect(pending.length).toBe(2);

    const updateMut = pending.find((m) => m.operation === 'UPDATE');
    expect(updateMut).toBeDefined();
    expect(updateMut?.entityId).toBe(task.id);
    expect(updateMut?.entityType).toBe('TASK');
    expect(updateMut?.payloadType).toBe('PARTIAL');
    expect(updateMut?.payload).toEqual({ completedAt: COMPLETE_TIME });
    expect(updateMut?.fieldTimestamps).toEqual({ completedAt: COMPLETE_TIME });
    expect(updateMut?.createdAt).toBe(COMPLETE_TIME);
  });

  it('maintains localStatus as CREATED if task was CREATED', async () => {
    const { task, store } = await create({ title: 'Local task' });
    expect(task.localStatus).toBe('CREATED');

    const completed = await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(COMPLETE_TIME)
    });
    expect(completed.localStatus).toBe('CREATED');
  });

  it('sets localStatus to UPDATED if task was SYNCED', async () => {
    const { task, store } = await create({ title: 'Synced task' });
    // Simulate synced state
    await store.saveTask({ ...task, localStatus: 'SYNCED', version: 1 });

    const completed = await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(COMPLETE_TIME)
    });
    expect(completed.localStatus).toBe('UPDATED');
  });

  it('is idempotent: calling completeTask on an already completed task does nothing', async () => {
    const { task, store } = await create({ title: 'Already completed' });
    const first = await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(COMPLETE_TIME),
      newId: () => MUT_COMPLETE_ID
    });

    const SECOND_TIME = '2020-01-01T13:00:00.000Z';
    const second = await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(SECOND_TIME),
      newId: () => 'different-mut-id'
    });

    expect(second.completedAt).toBe(COMPLETE_TIME);
    expect(second.updatedAt).toBe(COMPLETE_TIME);
    expect(second).toEqual(first);

    // No extra mutation should have been created
    const pending = await store.listPendingMutations(10);
    expect(pending.length).toBe(2); // 1 CREATE + 1 UPDATE
  });

  it('a simulated retry with the same idempotencyKey does not duplicate mutation', async () => {
    const { task, store } = await create({ title: 'Task' });
    const fixedMutId = 'mut-complete-fixed';

    await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(COMPLETE_TIME),
      newId: () => fixedMutId,
      idempotencyKey: 'same-complete-key'
    });

    // Re-save directly or retry
    const pendingBefore = await store.listPendingMutations(10);
    expect(pendingBefore.length).toBe(2);

    // Call again with same key
    await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(COMPLETE_TIME),
      newId: () => fixedMutId,
      idempotencyKey: 'same-complete-key'
    });

    const pendingAfter = await store.listPendingMutations(10);
    expect(pendingAfter.length).toBe(2);
  });

  it('NOTE cannot be completed as a TASK and throws InvalidTaskKindError', async () => {
    const store = makeStore();
    const noteId = 'note-id-123';
    await store.saveTask({
      id: noteId,
      projectId: INBOX_PROJECT_ID,
      userId: 'user-1',
      title: 'A note',
      kind: 'NOTE',
      priority: 0,
      isAllDay: false,
      timeZone: 'UTC',
      reminders: [],
      items: [],
      version: 0,
      localStatus: 'CREATED',
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME
    });

    await expect(
      completeTask(noteId, { store, userId: 'user-1' })
    ).rejects.toThrow(InvalidTaskKindError);

    // Ensure store was not modified
    const noteInStore = await store.getTask(noteId);
    expect(noteInStore?.completedAt).toBeUndefined();
  });

  it('throws TaskNotFoundError for a non-existent task id', async () => {
    const store = makeStore();
    await expect(
      completeTask('non-existent-id', { store, userId: 'user-1' })
    ).rejects.toThrow(TaskNotFoundError);
  });

  it('failed storage does not leave inconsistent state', async () => {
    const { task, store } = await create({ title: 'Task' });
    const failingStore = {
      ...store,
      getTask: store.getTask.bind(store),
      saveTaskWithMutation: async () => {
        throw new Error('IndexedDB storage failure');
      }
    };

    await expect(
      completeTask(task.id, {
        store: failingStore as unknown as typeof store,
        userId: 'user-1'
      })
    ).rejects.toThrow('IndexedDB storage failure');

    // The original task in store is still uncompleted
    const untouched = await store.getTask(task.id);
    expect(untouched?.completedAt).toBeNull();
    // Only 1 CREATE mutation exists, no orphan UPDATE mutation
    const pending = await store.listPendingMutations(10);
    expect(pending.length).toBe(1);
    expect(pending[0]?.operation).toBe('CREATE');
  });
});

describe('reopenTask', () => {
  const COMPLETE_TIME = '2020-01-01T12:00:00.000Z';
  const REOPEN_TIME = '2020-01-01T14:00:00.000Z';
  const MUT_COMPLETE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const MUT_REOPEN_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  async function createAndComplete() {
    const { task, store } = await create({ title: 'Task to complete & reopen' });
    const completed = await completeTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(COMPLETE_TIME),
      newId: () => MUT_COMPLETE_ID
    });
    return { task: completed, store };
  }

  it('reopens a completed TASK item and sets completedAt to null', async () => {
    const { task, store } = await createAndComplete();
    const reopened = await reopenTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(REOPEN_TIME),
      newId: () => MUT_REOPEN_ID
    });

    expect(reopened.completedAt).toBeNull();
    expect(reopened.updatedAt).toBe(REOPEN_TIME);
  });

  it('persists the reopened task in the store', async () => {
    const { task, store } = await createAndComplete();
    await reopenTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(REOPEN_TIME),
      newId: () => MUT_REOPEN_ID
    });

    const stored = await store.getTask(task.id);
    expect(stored?.completedAt).toBeNull();
    expect(stored?.updatedAt).toBe(REOPEN_TIME);
  });

  it('generates an UPDATE mutation setting completedAt to null with current field timestamp', async () => {
    const { task, store } = await createAndComplete();
    await reopenTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(REOPEN_TIME),
      newId: () => MUT_REOPEN_ID
    });

    const pending = await store.listPendingMutations(10);
    // 1 CREATE + 1 UPDATE (complete) + 1 UPDATE (reopen) = 3 total
    expect(pending.length).toBe(3);

    const reopenMut = pending.find((m) => m.id === MUT_REOPEN_ID);
    expect(reopenMut).toBeDefined();
    expect(reopenMut?.operation).toBe('UPDATE');
    expect(reopenMut?.payload).toEqual({ completedAt: null });
    expect(reopenMut?.fieldTimestamps).toEqual({ completedAt: REOPEN_TIME });
    expect(reopenMut?.createdAt).toBe(REOPEN_TIME);
  });

  it('is idempotent: calling reopenTask on an already open task does nothing', async () => {
    const { task, store } = await create({ title: 'Already open' });
    const reopened = await reopenTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(REOPEN_TIME)
    });

    expect(reopened.completedAt).toBeNull();
    expect(reopened.updatedAt).toBe(FIXED_TIME); // unchanged
    const pending = await store.listPendingMutations(10);
    expect(pending.length).toBe(1); // Only the initial CREATE
  });

  it('NOTE cannot be reopened as a TASK and throws InvalidTaskKindError', async () => {
    const store = makeStore();
    const noteId = 'note-id-456';
    await store.saveTask({
      id: noteId,
      projectId: INBOX_PROJECT_ID,
      userId: 'user-1',
      title: 'A note',
      kind: 'NOTE',
      priority: 0,
      isAllDay: false,
      timeZone: 'UTC',
      reminders: [],
      items: [],
      version: 0,
      localStatus: 'CREATED',
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME
    });

    await expect(
      reopenTask(noteId, { store, userId: 'user-1' })
    ).rejects.toThrow(InvalidTaskKindError);
  });

  it('throws TaskNotFoundError for a non-existent task id', async () => {
    const store = makeStore();
    await expect(
      reopenTask('non-existent-id', { store, userId: 'user-1' })
    ).rejects.toThrow(TaskNotFoundError);
  });
});

describe('deleteTask (soft delete)', () => {
  const DELETE_TIME = '2020-01-01T15:00:00.000Z';
  const MUT_DELETE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  it('soft-deletes a task by setting deletedAt and localStatus to DELETED', async () => {
    const { task, store } = await create({ title: 'Task to delete' });
    const deleted = await deleteTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(DELETE_TIME),
      newId: () => MUT_DELETE_ID
    });

    expect(deleted.deletedAt).toBe(DELETE_TIME);
    expect(deleted.updatedAt).toBe(DELETE_TIME);
    expect(deleted.localStatus).toBe('DELETED');
  });

  it('does NOT physically remove the task from storage (remains retrievable via getTask)', async () => {
    const { task, store } = await create({ title: 'Soft delete persistence' });
    await deleteTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(DELETE_TIME),
      newId: () => MUT_DELETE_ID
    });

    const stored = await store.getTask(task.id);
    expect(stored).toBeDefined();
    expect(stored?.id).toBe(task.id);
    expect(stored?.deletedAt).toBe(DELETE_TIME);
  });

  it('excludes soft-deleted task from normal listTasks', async () => {
    const { task, store } = await create({ title: 'Task to hide' });
    expect((await store.listTasks(INBOX_PROJECT_ID)).length).toBe(1);

    await deleteTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(DELETE_TIME),
      newId: () => MUT_DELETE_ID
    });

    const activeList = await store.listTasks(INBOX_PROJECT_ID);
    expect(activeList.length).toBe(0);

    const fullList = await store.listTasks(INBOX_PROJECT_ID, { includeDeleted: true });
    expect(fullList.length).toBe(1);
    expect(fullList[0]?.id).toBe(task.id);
  });

  it('generates an UPDATE mutation for soft delete', async () => {
    const { task, store } = await create({ title: 'Mutation check' });
    await deleteTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(DELETE_TIME),
      newId: () => MUT_DELETE_ID
    });

    const pending = await store.listPendingMutations(10);
    expect(pending.length).toBe(2); // 1 CREATE + 1 UPDATE

    const deleteMut = pending.find((m) => m.id === MUT_DELETE_ID);
    expect(deleteMut).toBeDefined();
    expect(deleteMut?.operation).toBe('UPDATE');
    expect(deleteMut?.payloadType).toBe('PARTIAL');
    expect(deleteMut?.payload).toEqual({ deletedAt: DELETE_TIME });
    expect(deleteMut?.fieldTimestamps).toEqual({ deletedAt: DELETE_TIME });
    expect(deleteMut?.createdAt).toBe(DELETE_TIME);
  });

  it('is idempotent: calling deleteTask on an already deleted task does nothing', async () => {
    const { task, store } = await create({ title: 'Already deleted' });
    const first = await deleteTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(DELETE_TIME),
      newId: () => MUT_DELETE_ID
    });

    const SECOND_DELETE = '2020-01-01T16:00:00.000Z';
    const second = await deleteTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(SECOND_DELETE),
      newId: () => 'another-mut-id'
    });

    expect(second.deletedAt).toBe(DELETE_TIME);
    expect(second.updatedAt).toBe(DELETE_TIME);
    expect(second).toEqual(first);

    // No extra mutation created
    const pending = await store.listPendingMutations(10);
    expect(pending.length).toBe(2);
  });

  it('soft-deletes a NOTE entity (preserves NOTE semantics)', async () => {
    const store = makeStore();
    const noteId = 'note-del-1';
    await store.saveTask({
      id: noteId,
      projectId: INBOX_PROJECT_ID,
      userId: 'user-1',
      title: 'A note to delete',
      kind: 'NOTE',
      priority: 0,
      isAllDay: false,
      timeZone: 'UTC',
      reminders: [],
      items: [],
      version: 0,
      localStatus: 'CREATED',
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME
    });

    const deleted = await deleteTask(noteId, {
      store,
      userId: 'user-1',
      now: () => new Date(DELETE_TIME)
    });
    expect(deleted.kind).toBe('NOTE');
    expect(deleted.deletedAt).toBe(DELETE_TIME);
    expect(await store.listTasks(INBOX_PROJECT_ID)).toEqual([]);
  });

  it('throws TaskNotFoundError for a non-existent task id', async () => {
    const store = makeStore();
    await expect(
      deleteTask('non-existent-id', { store, userId: 'user-1' })
    ).rejects.toThrow(TaskNotFoundError);
  });

  it('rollback after storage failure: leaves task active if storage throws', async () => {
    const { task, store } = await create({ title: 'Failing delete' });
    const failingStore = {
      ...store,
      getTask: store.getTask.bind(store),
      saveTaskWithMutation: async () => {
        throw new Error('Storage write failed');
      }
    };

    await expect(
      deleteTask(task.id, {
        store: failingStore as unknown as typeof store,
        userId: 'user-1'
      })
    ).rejects.toThrow('Storage write failed');

    // Task remains untouched in store
    const stored = await store.getTask(task.id);
    expect(stored?.deletedAt).toBeUndefined();
    expect(await store.listTasks(INBOX_PROJECT_ID)).toHaveLength(1);
  });
});

describe('restoreTask', () => {
  const DELETE_TIME = '2020-01-01T15:00:00.000Z';
  const RESTORE_TIME = '2020-01-01T17:00:00.000Z';
  const MUT_RESTORE_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

  async function createAndDelete() {
    const { task, store } = await create({ title: 'Task to restore' });
    const deleted = await deleteTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(DELETE_TIME)
    });
    return { task: deleted, store };
  }

  it('restores a soft-deleted task: sets deletedAt to null and updates updatedAt', async () => {
    const { task, store } = await createAndDelete();
    const restored = await restoreTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(RESTORE_TIME),
      newId: () => MUT_RESTORE_ID
    });

    expect(restored.deletedAt).toBeNull();
    expect(restored.updatedAt).toBe(RESTORE_TIME);
  });

  it('restored task reappears in listTasks', async () => {
    const { task, store } = await createAndDelete();
    expect((await store.listTasks(INBOX_PROJECT_ID)).length).toBe(0);

    await restoreTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(RESTORE_TIME),
      newId: () => MUT_RESTORE_ID
    });

    const activeList = await store.listTasks(INBOX_PROJECT_ID);
    expect(activeList.length).toBe(1);
    expect(activeList[0]?.id).toBe(task.id);
    expect(activeList[0]?.deletedAt).toBeNull();
  });

  it('generates an UPDATE mutation setting deletedAt to null', async () => {
    const { task, store } = await createAndDelete();
    await restoreTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(RESTORE_TIME),
      newId: () => MUT_RESTORE_ID
    });

    const pending = await store.listPendingMutations(10);
    // 1 CREATE + 1 UPDATE (delete) + 1 UPDATE (restore) = 3 total
    expect(pending.length).toBe(3);

    const restoreMut = pending.find((m) => m.id === MUT_RESTORE_ID);
    expect(restoreMut).toBeDefined();
    expect(restoreMut?.operation).toBe('UPDATE');
    expect(restoreMut?.payload).toEqual({ deletedAt: null });
    expect(restoreMut?.fieldTimestamps).toEqual({ deletedAt: RESTORE_TIME });
    expect(restoreMut?.createdAt).toBe(RESTORE_TIME);
  });

  it('is idempotent: calling restoreTask on an already active task does nothing', async () => {
    const { task, store } = await create({ title: 'Active task' });
    const restored = await restoreTask(task.id, {
      store,
      userId: 'user-1',
      now: () => new Date(RESTORE_TIME)
    });

    expect(restored.deletedAt).toBeUndefined();
    expect(restored.updatedAt).toBe(FIXED_TIME); // unchanged
    const pending = await store.listPendingMutations(10);
    expect(pending.length).toBe(1); // Only initial CREATE
  });

  it('restores a NOTE entity (preserves NOTE semantics)', async () => {
    const store = makeStore();
    const noteId = 'note-res-1';
    await store.saveTask({
      id: noteId,
      projectId: INBOX_PROJECT_ID,
      userId: 'user-1',
      title: 'A restored note',
      kind: 'NOTE',
      priority: 0,
      isAllDay: false,
      timeZone: 'UTC',
      reminders: [],
      items: [],
      version: 0,
      localStatus: 'DELETED',
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
      deletedAt: DELETE_TIME
    });

    const restored = await restoreTask(noteId, {
      store,
      userId: 'user-1',
      now: () => new Date(RESTORE_TIME)
    });
    expect(restored.kind).toBe('NOTE');
    expect(restored.deletedAt).toBeNull();
    expect((await store.listTasks(INBOX_PROJECT_ID)).length).toBe(1);
  });

  it('throws TaskNotFoundError for a non-existent task id', async () => {
    const store = makeStore();
    await expect(
      restoreTask('non-existent-id', { store, userId: 'user-1' })
    ).rejects.toThrow(TaskNotFoundError);
  });

  it('rollback after storage failure: leaves task deleted if storage throws', async () => {
    const { task, store } = await createAndDelete();
    const failingStore = {
      ...store,
      getTask: store.getTask.bind(store),
      saveTaskWithMutation: async () => {
        throw new Error('Storage write failed on restore');
      }
    };

    await expect(
      restoreTask(task.id, {
        store: failingStore as unknown as typeof store,
        userId: 'user-1'
      })
    ).rejects.toThrow('Storage write failed on restore');

    // Task remains deleted in store
    const stored = await store.getTask(task.id);
    expect(stored?.deletedAt).toBe(DELETE_TIME);
    expect(await store.listTasks(INBOX_PROJECT_ID)).toHaveLength(0);
  });
});

describe('Task Scheduling (P4-CAL-001)', () => {
  it('creates a task with dueDate, isAllDay and timeZone', async () => {
    const store = makeStore();
    const task = await createTask(
      {
        title: 'Task with schedule',
        dueDate: '2026-10-05T14:30:00.000Z',
        isAllDay: false,
        timeZone: 'Asia/Tehran'
      },
      { store, userId: 'user-1' }
    );

    expect(task.dueDate).toBe('2026-10-05T14:30:00.000Z');
    expect(task.isAllDay).toBe(false);
    expect(task.timeZone).toBe('Asia/Tehran');

    const inStore = await store.getTask(task.id);
    expect(inStore?.dueDate).toBe('2026-10-05T14:30:00.000Z');
    expect(inStore?.isAllDay).toBe(false);

    // Mutation has fieldTimestamps for dueDate
    const mutations = await store.listPendingMutations(10);
    expect(mutations[0]?.fieldTimestamps?.dueDate).toBeDefined();
    expect(mutations[0]?.fieldTimestamps?.isAllDay).toBeDefined();
  });

  it('rejects task creation if startDate > dueDate', async () => {
    const store = makeStore();
    await expect(
      createTask(
        {
          title: 'Invalid dates',
          startDate: '2026-10-10T00:00:00.000Z',
          dueDate: '2026-10-05T00:00:00.000Z'
        },
        { store, userId: 'user-1' }
      )
    ).rejects.toThrow(TaskValidationError);
  });

  it('schedules an existing task with partial UPDATE mutation and fieldTimestamps', async () => {
    const store = new MemoryLocalStore(() => new Date('2026-10-05T12:00:00.000Z'));
    const task = await createTask({ title: 'Plan launch' }, { store, userId: 'user-1' });

    const scheduled = await scheduleTask(
      task.id,
      {
        dueDate: '2026-10-06T09:00:00.000Z',
        startDate: '2026-10-05T08:00:00.000Z',
        isAllDay: false,
        timeZone: 'Asia/Tehran'
      },
      {
        store,
        userId: 'user-1',
        now: () => new Date('2026-10-05T02:00:00.000Z')
      }
    );

    expect(scheduled.dueDate).toBe('2026-10-06T09:00:00.000Z');
    expect(scheduled.startDate).toBe('2026-10-05T08:00:00.000Z');
    expect(scheduled.isAllDay).toBe(false);
    expect(scheduled.timeZone).toBe('Asia/Tehran');
    expect(scheduled.localStatus).toBe('CREATED'); // version was 0

    // Check store
    const inStore = await store.getTask(task.id);
    expect(inStore?.dueDate).toBe('2026-10-06T09:00:00.000Z');

    // Mutation check
    const mutations = await store.listPendingMutations(10);
    const updateMut = mutations.find((m) => m.operation === 'UPDATE');
    expect(updateMut).toBeDefined();
    expect(updateMut?.payloadType).toBe('PARTIAL');
    expect(updateMut?.fieldTimestamps?.dueDate).toBe('2026-10-05T02:00:00.000Z');
    expect(updateMut?.fieldTimestamps?.startDate).toBe('2026-10-05T02:00:00.000Z');
    expect(updateMut?.fieldTimestamps?.isAllDay).toBe('2026-10-05T02:00:00.000Z');
  });

  it('allows clearing dueDate by passing null', async () => {
    const store = new MemoryLocalStore(() => new Date('2026-10-05T12:00:00.000Z'));
    const task = await createTask(
      { title: 'Needs clearing', dueDate: '2026-10-05T12:00:00.000Z' },
      { store, userId: 'user-1' }
    );

    const cleared = await scheduleTask(
      task.id,
      { dueDate: null },
      {
        store,
        userId: 'user-1',
        now: () => new Date('2026-10-05T03:00:00.000Z')
      }
    );

    expect(cleared.dueDate).toBeNull();
    const inStore = await store.getTask(task.id);
    expect(inStore?.dueDate).toBeNull();

    const mutations = await store.listPendingMutations(10);
    const updateMut = mutations.find((m) => m.operation === 'UPDATE');
    expect(updateMut?.payload).toEqual({ dueDate: null });
    expect(updateMut?.fieldTimestamps?.dueDate).toBe('2026-10-05T03:00:00.000Z');
  });

  it('rejects scheduleTask if startDate > dueDate', async () => {
    const store = makeStore();
    const task = await createTask(
      { title: 'Fixed start', startDate: '2026-10-10T00:00:00.000Z' },
      { store, userId: 'user-1' }
    );

    await expect(
      scheduleTask(task.id, { dueDate: '2026-10-08T00:00:00.000Z' }, { store, userId: 'user-1' })
    ).rejects.toThrow(TaskValidationError);
  });

  it('throws TaskNotFoundError if task does not exist', async () => {
    const store = makeStore();
    await expect(
      scheduleTask('non-existent-id', { dueDate: '2026-10-05T00:00:00.000Z' }, { store, userId: 'user-1' })
    ).rejects.toThrow(TaskNotFoundError);
  });

  it('returns existing task if schedule input has no changes', async () => {
    const store = makeStore();
    const task = await createTask({ title: 'No changes' }, { store, userId: 'user-1' });

    const result = await scheduleTask(task.id, {}, { store, userId: 'user-1' });
    expect(result).toEqual(task);

    const mutations = await store.listPendingMutations(10);
    expect(mutations).toHaveLength(1); // Only CREATE mutation
  });
});

describe('rescheduleTask (P4-CAL-004)', () => {
  it('reschedules dueDate, startDate, duration, and isAllDay atomically', async () => {
    const store = makeStore();
    const task = await createTask(
      { title: 'Time block task' },
      { store, userId: 'user-1' }
    );

    const nowIso = '2026-10-05T08:30:00.000Z';
    const updated = await rescheduleTask(
      store,
      task.id,
      {
        startDate: '2026-10-05T09:00:00.000Z',
        dueDate: '2026-10-05T10:00:00.000Z',
        duration: 60,
        isAllDay: false
      },
      {
        now: () => new Date(nowIso),
        newId: () => 'mut-reschedule-1'
      }
    );

    expect(updated.startDate).toBe('2026-10-05T09:00:00.000Z');
    expect(updated.dueDate).toBe('2026-10-05T10:00:00.000Z');
    expect(updated.duration).toBe(60);
    expect(updated.isAllDay).toBe(false);
    expect(updated.allDay).toBe(false);
    expect(updated.updatedAt).toBe(nowIso);
    expect(updated.localStatus).toBe('CREATED'); // version is 0

    // Verify stored entity
    const inStore = await store.getTask(task.id);
    expect(inStore?.startDate).toBe('2026-10-05T09:00:00.000Z');
    expect(inStore?.dueDate).toBe('2026-10-05T10:00:00.000Z');
    expect(inStore?.duration).toBe(60);
    expect(inStore?.isAllDay).toBe(false);

    // Verify sync mutation
    const mutations = await store.listPendingMutations(10);
    const updateMut = mutations.find((m) => m.id === 'mut-reschedule-1');
    expect(updateMut).toBeDefined();
    expect(updateMut?.operation).toBe('UPDATE');
    expect(updateMut?.payloadType).toBe('PARTIAL');
    expect(updateMut?.payload).toEqual({
      startDate: '2026-10-05T09:00:00.000Z',
      dueDate: '2026-10-05T10:00:00.000Z',
      duration: 60,
      isAllDay: false,
      allDay: false
    });
    expect(updateMut?.fieldTimestamps).toEqual({
      startDate: nowIso,
      dueDate: nowIso,
      duration: nowIso,
      isAllDay: nowIso
    });
  });

  it('updates localStatus to UPDATED when version > 0', async () => {
    const store = makeStore();
    const task = await createTask({ title: 'Synced task' }, { store, userId: 'user-1' });
    const syncedTask = { ...task, version: 1, localStatus: 'SYNCED' as const };
    await store.saveTask(syncedTask);

    const updated = await rescheduleTask(
      store,
      task.id,
      { isAllDay: true },
      { newId: () => 'mut-reschedule-2' }
    );

    expect(updated.version).toBe(1);
    expect(updated.localStatus).toBe('UPDATED');
    expect(updated.isAllDay).toBe(true);
  });

  it('allows clearing scheduling fields with null', async () => {
    const store = makeStore();
    const task = await createTask(
      {
        title: 'Task with dates',
        startDate: '2026-10-05T09:00:00.000Z',
        dueDate: '2026-10-05T10:00:00.000Z',
        duration: 60
      },
      { store, userId: 'user-1' }
    );

    const updated = await rescheduleTask(
      store,
      task.id,
      {
        startDate: null,
        dueDate: null,
        duration: null
      },
      { newId: () => 'mut-clear-1' }
    );

    expect(updated.startDate).toBeNull();
    expect(updated.dueDate).toBeNull();
    expect(updated.duration).toBeNull();

    const mutations = await store.listPendingMutations(10);
    const updateMut = mutations.find((m) => m.id === 'mut-clear-1');
    expect(updateMut?.payload).toEqual({
      startDate: null,
      dueDate: null,
      duration: null
    });
  });

  it('throws TaskValidationError if startDate > dueDate', async () => {
    const store = makeStore();
    const task = await createTask(
      {
        title: 'Validation task',
        dueDate: '2026-10-05T09:00:00.000Z'
      },
      { store, userId: 'user-1' }
    );

    await expect(
      rescheduleTask(store, task.id, {
        startDate: '2026-10-05T10:00:00.000Z' // start > due
      })
    ).rejects.toThrow(TaskValidationError);
  });

  it('throws TaskValidationError if duration is negative', async () => {
    const store = makeStore();
    const task = await createTask({ title: 'Duration test' }, { store, userId: 'user-1' });

    await expect(
      rescheduleTask(store, task.id, { duration: -15 })
    ).rejects.toThrow(TaskValidationError);
  });

  it('throws TaskNotFoundError if task does not exist', async () => {
    const store = makeStore();
    await expect(
      rescheduleTask(store, 'unknown-task-id', { duration: 30 })
    ).rejects.toThrow(TaskNotFoundError);
  });

  it('returns unchanged task if no reschedule updates are provided', async () => {
    const store = makeStore();
    const task = await createTask({ title: 'No changes' }, { store, userId: 'user-1' });

    const updated = await rescheduleTask(store, task.id, {});
    expect(updated).toEqual(task);

    const mutations = await store.listPendingMutations(10);
    expect(mutations).toHaveLength(1); // Only initial CREATE mutation
  });
});

describe('Today and Tomorrow Date Filtering (P4-CAL-001)', () => {
  const refDate = new Date('2026-10-05T12:00:00.000Z'); // 2026-10-05

  it('identifies tasks due today correctly', () => {
    const todayTask = {
      id: '1',
      title: 'Due today',
      dueDate: '2026-10-05T09:00:00.000Z',
      timeZone: 'UTC',
      kind: 'TASK',
      priority: 1,
      isAllDay: false,
      items: [],
      reminders: [],
      version: 1,
      localStatus: 'SYNCED',
      projectId: 'inbox',
      userId: 'user-1',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z'
    } as unknown as TaskEntity;

    const tomorrowTask = {
      ...todayTask,
      id: '2',
      title: 'Due tomorrow',
      dueDate: '2026-10-06T15:00:00.000Z'
    };

    const deletedTask = {
      ...todayTask,
      id: '3',
      deletedAt: '2026-10-05T10:00:00.000Z'
    };

    expect(isDueToday(todayTask, refDate, 'UTC')).toBe(true);
    expect(isDueToday(tomorrowTask, refDate, 'UTC')).toBe(false);
    expect(isDueToday(deletedTask, refDate, 'UTC')).toBe(false);

    expect(isDueTomorrow(tomorrowTask, refDate, 'UTC')).toBe(true);
    expect(isDueTomorrow(todayTask, refDate, 'UTC')).toBe(false);
  });

  it('filters and sorts tasks due today', () => {
    const taskA = {
      id: 'a',
      title: 'High priority earlier today',
      dueDate: '2026-10-05T08:00:00.000Z',
      priority: 5,
      timeZone: 'UTC',
      completedAt: null,
      createdAt: '2026-10-01T00:00:00.000Z'
    } as unknown as TaskEntity;

    const taskB = {
      id: 'b',
      title: 'Completed today',
      dueDate: '2026-10-05T10:00:00.000Z',
      priority: 5,
      timeZone: 'UTC',
      completedAt: '2026-10-05T09:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z'
    } as unknown as TaskEntity;

    const taskC = {
      id: 'c',
      title: 'Lower priority today',
      dueDate: '2026-10-05T11:00:00.000Z',
      priority: 1,
      timeZone: 'UTC',
      completedAt: null,
      createdAt: '2026-10-01T00:00:00.000Z'
    } as unknown as TaskEntity;

    const taskTomorrow = {
      id: 'd',
      title: 'Tomorrow',
      dueDate: '2026-10-06T09:00:00.000Z',
      priority: 3,
      timeZone: 'UTC',
      completedAt: null,
      createdAt: '2026-10-01T00:00:00.000Z'
    } as unknown as TaskEntity;

    const todayList = filterTasksDueToday([taskB, taskTomorrow, taskC, taskA], refDate, 'UTC');
    expect(todayList.map((t) => t.id)).toEqual(['a', 'c', 'b']); // Uncompleted by priority, then completed

    const tomorrowList = filterTasksDueTomorrow([taskB, taskTomorrow, taskC, taskA], refDate, 'UTC');
    expect(tomorrowList.map((t) => t.id)).toEqual(['d']);
  });
});
