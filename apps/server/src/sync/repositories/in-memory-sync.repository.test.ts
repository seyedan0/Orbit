import { beforeEach, describe, expect, it } from 'vitest';
import type { MutationPayload } from '@orbit/shared-types';
import { InMemorySyncRepository } from './in-memory-sync.repository.js';

describe('InMemorySyncRepository (Tombstone Retention Unit Tests)', () => {
  let repo: InMemorySyncRepository;
  const userId = 'user-unit-1';

  beforeEach(() => {
    repo = new InMemorySyncRepository();
  });

  const createTask = async (
    id: string,
    overrides: Partial<MutationPayload['payload']> = {}
  ) => {
    const mut: MutationPayload = {
      id: `mut-c-${id}`,
      idempotencyKey: `idemp-c-${id}`,
      entityType: 'TASK',
      entityId: id,
      operation: 'CREATE',
      baseVersion: 0,
      payloadType: 'FULL',
      payload: {
        title: `Task ${id}`,
        ...overrides
      },
      fieldTimestamps: {},
      createdAt: '2026-08-01T10:00:00.000Z'
    };
    return repo.applyMutationAtomic(userId, mut);
  };

  it('preserves soft-deleted task in getChanges', async () => {
    await createTask('task-1', { deletedAt: '2026-09-01T10:00:00.000Z' });
    const changes = await repo.getChanges(userId, '0', 50);
    expect(changes.changes).toHaveLength(1);
    expect(changes.changes[0]?.deletedAt).toBe('2026-09-01T10:00:00.000Z');
  });

  it('does not clean tombstones before retention cutoff', async () => {
    await createTask('task-recent', { deletedAt: '2026-09-25T10:00:00.000Z' });
    const res = await repo.cleanTombstones({
      userId,
      retentionDays: 30,
      now: new Date('2026-09-30T10:00:00.000Z')
    });
    expect(res.cleanedCount).toBe(0);
    const changes = await repo.getChanges(userId, '0', 50);
    expect(changes.changes).toHaveLength(1);
  });

  it('cleans eligible tombstones and ignores active tasks', async () => {
    await createTask('task-old-deleted', { deletedAt: '2026-08-10T10:00:00.000Z' });
    await createTask('task-active', { deletedAt: null });

    const res = await repo.cleanTombstones({
      userId,
      retentionDays: 30,
      now: new Date('2026-09-30T10:00:00.000Z')
    });

    expect(res.cleanedCount).toBe(1);
    expect(res.cleanedTaskIds).toEqual(['task-old-deleted']);

    const changes = await repo.getChanges(userId, '0', 50);
    expect(changes.changes.map((t) => t.id)).toEqual(['task-active']);
  });

  it('is idempotent on multiple cleanup runs', async () => {
    await createTask('task-idemp', { deletedAt: '2026-08-01T10:00:00.000Z' });
    const res1 = await repo.cleanTombstones({
      userId,
      retentionDays: 30,
      now: new Date('2026-09-30T10:00:00.000Z')
    });
    expect(res1.cleanedCount).toBe(1);

    const res2 = await repo.cleanTombstones({
      userId,
      retentionDays: 30,
      now: new Date('2026-09-30T10:00:00.000Z')
    });
    expect(res2.cleanedCount).toBe(0);
  });

  it('rejects late mutation attempting to resurrect expired tombstone', async () => {
    await createTask('task-purged', { deletedAt: '2026-08-01T10:00:00.000Z' });
    await repo.cleanTombstones({
      userId,
      retentionDays: 30,
      now: new Date('2026-09-30T10:00:00.000Z')
    });

    const lateMut: MutationPayload = {
      id: 'mut-late',
      idempotencyKey: 'idemp-late',
      entityType: 'TASK',
      entityId: 'task-purged',
      operation: 'UPDATE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: { title: 'Late Update' },
      fieldTimestamps: {},
      createdAt: '2026-10-01T10:00:00.000Z'
    };

    const res = await repo.applyMutationAtomic(userId, lateMut);
    expect(res.status).toBe('REJECTED');
    expect(res.error).toContain('cannot be resurrected');
  });
});
