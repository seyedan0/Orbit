import { describe, expect, it } from 'vitest';
import type { MutationPayload } from '@orbit/shared-types';
import { mergeTaskFieldsWithLww } from './conflict-resolution.util.js';
import { TaskEntityModel } from '../../database/entities/task.entity.js';

describe('mergeTaskFieldsWithLww (Pure Conflict Resolution Logic)', () => {
  const userId = 'user-test-lww';

  const createBaseTask = (overrides: Partial<TaskEntityModel> = {}): TaskEntityModel => {
    const task = new TaskEntityModel();
    task.id = 'task-base-1';
    task.userId = userId;
    task.projectId = 'inbox';
    task.title = 'Initial Title';
    task.kind = 'TASK';
    task.priority = 0;
    task.isAllDay = false;
    task.timeZone = 'UTC';
    task.reminders = [];
    task.items = [];
    task.version = 1;
    task.localStatus = 'SYNCED';
    task.cursor = '1';
    task.createdAt = '2026-10-02T10:00:00.000Z';
    task.updatedAt = '2026-10-02T10:00:00.000Z';
    task.completedAt = null;
    task.deletedAt = null;
    task.fieldTimestamps = {
      title: '2026-10-02T10:00:00.000Z',
      dueDate: '2026-10-02T10:00:00.000Z'
    };
    task.lastMutationId = 'mut-base-1';
    Object.assign(task, overrides);
    return task;
  };

  it('initializes a brand new task from CREATE mutation as APPLIED', () => {
    const mut: MutationPayload = {
      id: 'mut-init-1',
      idempotencyKey: 'idemp-init-1',
      entityType: 'TASK',
      entityId: 'task-new-1',
      operation: 'CREATE',
      baseVersion: 0,
      payloadType: 'FULL',
      payload: {
        title: 'New Task',
        priority: 1,
        dueDate: '2026-10-10T00:00:00.000Z'
      },
      fieldTimestamps: {
        title: '2026-10-02T10:00:00.000Z',
        priority: '2026-10-02T10:00:00.000Z',
        dueDate: '2026-10-02T10:00:00.000Z'
      },
      createdAt: '2026-10-02T10:00:00.000Z'
    };

    const res = mergeTaskFieldsWithLww(null, mut, userId);
    expect(res.status).toBe('APPLIED');
    expect(res.task.id).toBe('task-new-1');
    expect(res.task.title).toBe('New Task');
    expect(res.task.priority).toBe(1);
    expect(res.task.dueDate).toBe('2026-10-10T00:00:00.000Z');
    expect(res.task.lastMutationId).toBe('mut-init-1');
    expect(res.task.fieldTimestamps.title).toBe('2026-10-02T10:00:00.000Z');
  });

  it('cleanly applies sequential update when baseVersion matches current version', () => {
    const existing = createBaseTask();
    const mut: MutationPayload = {
      id: 'mut-seq-2',
      idempotencyKey: 'idemp-seq-2',
      entityType: 'TASK',
      entityId: existing.id,
      operation: 'UPDATE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        title: 'Updated Sequential Title'
      },
      fieldTimestamps: {
        title: '2026-10-02T10:05:00.000Z'
      },
      createdAt: '2026-10-02T10:05:00.000Z'
    };

    const res = mergeTaskFieldsWithLww(existing, mut, userId);
    expect(res.status).toBe('APPLIED');
    expect(res.task.title).toBe('Updated Sequential Title');
    expect(res.task.lastMutationId).toBe('mut-seq-2');
    expect(res.task.fieldTimestamps.title).toBe('2026-10-02T10:05:00.000Z');
  });

  it('merges concurrent edits on disjoint fields preserving both and marking CONFLICT_MERGED', () => {
    // Existing task had title updated by Client A at version 2
    const taskAfterClientA = createBaseTask({
      title: 'Title from Client A',
      version: 2,
      lastMutationId: 'mut-client-a',
      fieldTimestamps: {
        title: '2026-10-02T10:05:00.000Z',
        dueDate: '2026-10-02T10:00:00.000Z'
      }
    });

    // Client B was offline / concurrent, branched from version 1 and updated dueDate
    const mutClientB: MutationPayload = {
      id: 'mut-client-b',
      idempotencyKey: 'idemp-b',
      entityType: 'TASK',
      entityId: taskAfterClientA.id,
      operation: 'UPDATE',
      baseVersion: 1, // Divergent baseVersion
      payloadType: 'PARTIAL',
      payload: {
        dueDate: '2026-10-20T00:00:00.000Z'
      },
      fieldTimestamps: {
        dueDate: '2026-10-02T10:04:00.000Z'
      },
      createdAt: '2026-10-02T10:04:00.000Z'
    };

    const res = mergeTaskFieldsWithLww(taskAfterClientA, mutClientB, userId);

    expect(res.status).toBe('CONFLICT_MERGED');
    // Both fields preserved!
    expect(res.task.title).toBe('Title from Client A');
    expect(res.task.dueDate).toBe('2026-10-20T00:00:00.000Z');
    expect(res.task.fieldTimestamps.title).toBe('2026-10-02T10:05:00.000Z');
    expect(res.task.fieldTimestamps.dueDate).toBe('2026-10-02T10:04:00.000Z');
    expect(res.task.lastMutationId).toBe('mut-client-b');
  });

  it('resolves concurrent edits on the same field using higher timestamp', () => {
    const existing = createBaseTask({
      title: 'Newer Server Title',
      fieldTimestamps: {
        title: '2026-10-02T10:10:00.000Z'
      }
    });

    // Stale mutation with older timestamp
    const staleMut: MutationPayload = {
      id: 'mut-stale',
      idempotencyKey: 'idemp-stale',
      entityType: 'TASK',
      entityId: existing.id,
      operation: 'UPDATE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        title: 'Stale Client Title'
      },
      fieldTimestamps: {
        title: '2026-10-02T10:05:00.000Z' // Older than 10:10:00.000Z
      },
      createdAt: '2026-10-02T10:05:00.000Z'
    };

    const res = mergeTaskFieldsWithLww(existing, staleMut, userId);
    expect(res.status).toBe('CONFLICT_MERGED');
    expect(res.task.title).toBe('Newer Server Title'); // Server title preserved!
    expect(res.losingFields).toContain('title');
    expect(res.winningFields).toHaveLength(0);
  });

  it('uses lexicographical mutation.id as tie-breaker when field timestamps are identical', () => {
    const timestamp = '2026-10-02T10:00:00.000Z';

    const existing = createBaseTask({
      title: 'Alpha Title',
      lastMutationId: 'mut-alpha',
      fieldTimestamps: {
        title: timestamp
      }
    });

    // Mutation with higher mutation ID ('mut-beta' > 'mut-alpha')
    const betaMut: MutationPayload = {
      id: 'mut-beta',
      idempotencyKey: 'idemp-beta',
      entityType: 'TASK',
      entityId: existing.id,
      operation: 'UPDATE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        title: 'Beta Title'
      },
      fieldTimestamps: {
        title: timestamp
      },
      createdAt: timestamp
    };

    const resBeta = mergeTaskFieldsWithLww(existing, betaMut, userId);
    expect(resBeta.winningFields).toContain('title');
    expect(resBeta.task.title).toBe('Beta Title');
    expect(resBeta.task.lastMutationId).toBe('mut-beta');

    // Mutation with lower mutation ID ('mut-aaa' < 'mut-beta')
    const aaaMut: MutationPayload = {
      id: 'mut-aaa',
      idempotencyKey: 'idemp-aaa',
      entityType: 'TASK',
      entityId: existing.id,
      operation: 'UPDATE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        title: 'AAA Title'
      },
      fieldTimestamps: {
        title: timestamp
      },
      createdAt: timestamp
    };

    const resAaa = mergeTaskFieldsWithLww(resBeta.task, aaaMut, userId);
    expect(resAaa.losingFields).toContain('title');
    expect(resAaa.task.title).toBe('Beta Title'); // Beta preserved!
    expect(resAaa.task.lastMutationId).toBe('mut-beta');
  });

  it('handles deletion vs edit conflict based on timestamps (Rule 3)', () => {
    // 1. Task deleted at 10:15
    const existing = createBaseTask({
      deletedAt: '2026-10-02T10:15:00.000Z',
      fieldTimestamps: {
        deletedAt: '2026-10-02T10:15:00.000Z'
      }
    });

    // 2. Client sent restore at 10:20 (newer than deletion)
    const restoreMut: MutationPayload = {
      id: 'mut-restore',
      idempotencyKey: 'idemp-restore',
      entityType: 'TASK',
      entityId: existing.id,
      operation: 'UPDATE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        deletedAt: null
      },
      fieldTimestamps: {
        deletedAt: '2026-10-02T10:20:00.000Z'
      },
      createdAt: '2026-10-02T10:20:00.000Z'
    };

    const resRestore = mergeTaskFieldsWithLww(existing, restoreMut, userId);
    expect(resRestore.winningFields).toContain('deletedAt');
    expect(resRestore.task.deletedAt).toBeNull(); // Restored!

    // 3. Stale delete from 10:10 arriving on restored task (10:10 < 10:20)
    const staleDeleteMut: MutationPayload = {
      id: 'mut-stale-del',
      idempotencyKey: 'idemp-stale-del',
      entityType: 'TASK',
      entityId: existing.id,
      operation: 'DELETE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        deletedAt: '2026-10-02T10:10:00.000Z'
      },
      fieldTimestamps: {
        deletedAt: '2026-10-02T10:10:00.000Z'
      },
      createdAt: '2026-10-02T10:10:00.000Z'
    };

    const resStaleDelete = mergeTaskFieldsWithLww(resRestore.task, staleDeleteMut, userId);
    expect(resStaleDelete.losingFields).toContain('deletedAt');
    expect(resStaleDelete.task.deletedAt).toBeNull(); // Still restored!
  });
});
