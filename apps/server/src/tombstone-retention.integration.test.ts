import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import type { AuthResponse, MutationPayload } from '@orbit/shared-types';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { SYNC_REPOSITORY } from './sync/interfaces/sync-repository.interface.js';
import { PostgresSyncRepository } from './sync/repositories/postgres-sync.repository.js';
import { CleanedTombstoneEntity, TaskEntityModel } from './database/entities/index.js';
import { bearer, deleteTestUsers, registerTestUser } from './testing/auth-test-helpers.js';

describe('Tombstone Handling and Retention Policy (Integration)', () => {
  let app: INestApplication;
  let repo: PostgresSyncRepository;
  let dataSource: DataSource;
  let authUser: AuthResponse;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    repo = moduleRef.get<PostgresSyncRepository>(SYNC_REPOSITORY);
    dataSource = moduleRef.get<DataSource>(getDataSourceToken());
    authUser = await registerTestUser(app, 'tombstone-user');
  });

  afterAll(async () => {
    if (repo) {
      await repo.clear();
    }
    if (dataSource && authUser) {
      await deleteTestUsers(dataSource, [authUser.user.id]);
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await repo.clear();
  });

  const createTestTask = async (
    taskId: string,
    overrides: Partial<MutationPayload['payload']> = {}
  ): Promise<void> => {
    const initMut: MutationPayload = {
      id: `mut-create-${taskId}`,
      idempotencyKey: `idemp-create-${taskId}`,
      entityType: 'TASK',
      entityId: taskId,
      operation: 'CREATE',
      baseVersion: 0,
      payloadType: 'FULL',
      payload: {
        projectId: 'inbox',
        title: `Task ${taskId}`,
        kind: 'TASK',
        priority: 0,
        isAllDay: false,
        timeZone: 'UTC',
        reminders: [],
        items: [],
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
        ...overrides
      },
      fieldTimestamps: {
        title: '2026-08-01T10:00:00.000Z',
        ...(overrides.deletedAt ? { deletedAt: overrides.deletedAt } : {})
      },
      createdAt: '2026-08-01T10:00:00.000Z'
    };
    await repo.applyMutationAtomic(authUser.user.id, initMut);
  };

  it('1. soft-deleted task appears in sync changes', async () => {
    const taskId = 'task-sync-soft-deleted';
    await createTestTask(taskId);

    // Soft-delete the task
    const deleteMut: MutationPayload = {
      id: `mut-del-${taskId}`,
      idempotencyKey: `idemp-del-${taskId}`,
      entityType: 'TASK',
      entityId: taskId,
      operation: 'DELETE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        deletedAt: '2026-08-10T12:00:00.000Z'
      },
      fieldTimestamps: {
        deletedAt: '2026-08-10T12:00:00.000Z'
      },
      createdAt: '2026-08-10T12:00:00.000Z'
    };
    await repo.applyMutationAtomic(authUser.user.id, deleteMut);

    // Pull from cursor 0
    const pullResult = await repo.getChanges(authUser.user.id, '0', 50);
    const pulledTask = pullResult.changes.find((t) => t.id === taskId);

    expect(pulledTask).toBeDefined();
    expect(pulledTask?.deletedAt).toBe('2026-08-10T12:00:00.000Z');
  });

  it('2. tombstone is not cleaned before retention', async () => {
    const taskId = 'task-recent-tombstone';
    // Deleted 5 days ago relative to now: 2026-09-25T00:00:00.000Z
    // Retention window is 30 days
    await createTestTask(taskId, {
      deletedAt: '2026-09-25T12:00:00.000Z'
    });

    const now = new Date('2026-09-30T12:00:00.000Z');
    const result = await repo.cleanTombstones({
      userId: authUser.user.id,
      retentionDays: 30,
      now
    });

    expect(result.cleanedCount).toBe(0);
    expect(result.cleanedTaskIds).not.toContain(taskId);

    // Verify task still exists in tasks table
    const taskInDb = await dataSource.manager.findOne(TaskEntityModel, {
      where: { id: taskId, userId: authUser.user.id }
    });
    expect(taskInDb).not.toBeNull();
    expect(taskInDb?.deletedAt).toBe('2026-09-25T12:00:00.000Z');

    // Verify not in cleaned_tombstones
    const cleanedRecord = await dataSource.manager.findOne(CleanedTombstoneEntity, {
      where: { entityId: taskId, userId: authUser.user.id }
    });
    expect(cleanedRecord).toBeNull();
  });

  it('3. eligible tombstone is cleaned', async () => {
    const taskId = 'task-expired-tombstone';
    // Deleted 40 days ago relative to reference now: 2026-09-30
    await createTestTask(taskId, {
      deletedAt: '2026-08-20T12:00:00.000Z'
    });

    const now = new Date('2026-09-30T12:00:00.000Z');
    const result = await repo.cleanTombstones({
      userId: authUser.user.id,
      retentionDays: 30,
      now
    });

    expect(result.cleanedCount).toBe(1);
    expect(result.cleanedTaskIds).toContain(taskId);

    // Physically removed from tasks table
    const taskInDb = await dataSource.manager.findOne(TaskEntityModel, {
      where: { id: taskId, userId: authUser.user.id }
    });
    expect(taskInDb).toBeNull();

    // Logged in cleaned_tombstones table
    const cleanedRecord = await dataSource.manager.findOne(CleanedTombstoneEntity, {
      where: { entityId: taskId, userId: authUser.user.id }
    });
    expect(cleanedRecord).not.toBeNull();
    expect(cleanedRecord?.entityId).toBe(taskId);
    expect(cleanedRecord?.deletedAt).toBe('2026-08-20T12:00:00.000Z');
  });

  it('4. active task is never cleaned', async () => {
    const activeTaskId = 'task-active-ancient';
    // Created long ago, but active (deletedAt is null)
    await createTestTask(activeTaskId, {
      deletedAt: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    });

    const now = new Date('2026-09-30T12:00:00.000Z');
    const result = await repo.cleanTombstones({
      userId: authUser.user.id,
      retentionDays: 30,
      now
    });

    expect(result.cleanedCount).toBe(0);

    const taskInDb = await dataSource.manager.findOne(TaskEntityModel, {
      where: { id: activeTaskId, userId: authUser.user.id }
    });
    expect(taskInDb).not.toBeNull();
    expect(taskInDb?.deletedAt).toBeNull();
  });

  it('5. cleanup is idempotent', async () => {
    const taskId = 'task-idempotent-cleanup';
    await createTestTask(taskId, {
      deletedAt: '2026-08-15T12:00:00.000Z'
    });

    const now = new Date('2026-09-30T12:00:00.000Z');

    // First cleanup run
    const result1 = await repo.cleanTombstones({
      userId: authUser.user.id,
      retentionDays: 30,
      now
    });
    expect(result1.cleanedCount).toBe(1);
    expect(result1.cleanedTaskIds).toEqual([taskId]);

    // Second cleanup run with exact same parameters
    const result2 = await repo.cleanTombstones({
      userId: authUser.user.id,
      retentionDays: 30,
      now
    });
    expect(result2.cleanedCount).toBe(0);
    expect(result2.cleanedTaskIds).toEqual([]);

    // Check database consistency: exactly one cleaned record exists
    const records = await dataSource.manager.find(CleanedTombstoneEntity, {
      where: { entityId: taskId, userId: authUser.user.id }
    });
    expect(records).toHaveLength(1);
  });

  it('6. late mutation cannot resurrect an expired tombstone', async () => {
    const taskId = 'task-cannot-resurrect';
    await createTestTask(taskId, {
      deletedAt: '2026-08-01T12:00:00.000Z'
    });

    // Clean it up
    await repo.cleanTombstones({
      userId: authUser.user.id,
      retentionDays: 30,
      now: new Date('2026-09-30T12:00:00.000Z')
    });

    // Late client attempts to UPDATE or resurrect the task
    const lateUpdateMut: MutationPayload = {
      id: 'mut-late-resurrect-update',
      idempotencyKey: 'idemp-late-resurrect-update',
      entityType: 'TASK',
      entityId: taskId,
      operation: 'UPDATE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        title: 'Zombie Task Resurrected',
        deletedAt: null
      },
      fieldTimestamps: {
        title: '2026-10-01T10:00:00.000Z',
        deletedAt: '2026-10-01T10:00:00.000Z'
      },
      createdAt: '2026-10-01T10:00:00.000Z'
    };

    const updateResult = await repo.applyMutationAtomic(authUser.user.id, lateUpdateMut);
    expect(updateResult.status).toBe('REJECTED');
    expect(updateResult.error).toContain('cannot be resurrected');

    // Late client attempts to CREATE task with the same ID
    const lateCreateMut: MutationPayload = {
      id: 'mut-late-resurrect-create',
      idempotencyKey: 'idemp-late-resurrect-create',
      entityType: 'TASK',
      entityId: taskId,
      operation: 'CREATE',
      baseVersion: 0,
      payloadType: 'FULL',
      payload: {
        projectId: 'inbox',
        title: 'Reborn Task',
        kind: 'TASK',
        priority: 0,
        isAllDay: false,
        timeZone: 'UTC',
        reminders: [],
        items: []
      },
      fieldTimestamps: {
        title: '2026-10-01T10:00:00.000Z'
      },
      createdAt: '2026-10-01T10:00:00.000Z'
    };

    const createResult = await repo.applyMutationAtomic(authUser.user.id, lateCreateMut);
    expect(createResult.status).toBe('REJECTED');

    // Verify task is NOT in tasks table
    const taskInDb = await dataSource.manager.findOne(TaskEntityModel, {
      where: { id: taskId, userId: authUser.user.id }
    });
    expect(taskInDb).toBeNull();
  });

  it('7. delete versus update conflict based on field-level LWW', async () => {
    const taskId = 'task-del-vs-update';
    await createTestTask(taskId);

    // Client A deletes at 12:00:00
    const delMut: MutationPayload = {
      id: 'mut-del-first',
      idempotencyKey: 'idemp-del-first',
      entityType: 'TASK',
      entityId: taskId,
      operation: 'DELETE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        deletedAt: '2026-08-10T12:00:00.000Z'
      },
      fieldTimestamps: {
        deletedAt: '2026-08-10T12:00:00.000Z'
      },
      createdAt: '2026-08-10T12:00:00.000Z'
    };
    await repo.applyMutationAtomic(authUser.user.id, delMut);

    // Client B sends older edit at 11:00:00
    const olderEditMut: MutationPayload = {
      id: 'mut-edit-older',
      idempotencyKey: 'idemp-edit-older',
      entityType: 'TASK',
      entityId: taskId,
      operation: 'UPDATE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        title: 'Older Concurrent Edit'
      },
      fieldTimestamps: {
        title: '2026-08-10T11:00:00.000Z'
      },
      createdAt: '2026-08-10T11:00:00.000Z'
    };
    const editRes = await repo.applyMutationAtomic(authUser.user.id, olderEditMut);
    expect(editRes.status).toBe('CONFLICT_MERGED');

    const taskAfter = await dataSource.manager.findOne(TaskEntityModel, {
      where: { id: taskId, userId: authUser.user.id }
    });
    // Task title may be merged, but deletion remains intact
    expect(taskAfter?.deletedAt).toBe('2026-08-10T12:00:00.000Z');
  });

  it('8. restore before cleanup succeeds via LWW', async () => {
    const taskId = 'task-restore-before-cleanup';
    await createTestTask(taskId);

    // Soft-delete at 10:00:00
    const delMut: MutationPayload = {
      id: 'mut-del-before-restore',
      idempotencyKey: 'idemp-del-before-restore',
      entityType: 'TASK',
      entityId: taskId,
      operation: 'DELETE',
      baseVersion: 1,
      payloadType: 'PARTIAL',
      payload: {
        deletedAt: '2026-08-10T10:00:00.000Z'
      },
      fieldTimestamps: {
        deletedAt: '2026-08-10T10:00:00.000Z'
      },
      createdAt: '2026-08-10T10:00:00.000Z'
    };
    await repo.applyMutationAtomic(authUser.user.id, delMut);

    // Restore at 11:00:00 (newer than deletion)
    const restoreMut: MutationPayload = {
      id: 'mut-restore-action',
      idempotencyKey: 'idemp-restore-action',
      entityType: 'TASK',
      entityId: taskId,
      operation: 'UPDATE',
      baseVersion: 2,
      payloadType: 'PARTIAL',
      payload: {
        deletedAt: null
      },
      fieldTimestamps: {
        deletedAt: '2026-08-10T11:00:00.000Z'
      },
      createdAt: '2026-08-10T11:00:00.000Z'
    };
    const restoreRes = await repo.applyMutationAtomic(authUser.user.id, restoreMut);
    expect(['APPLIED', 'CONFLICT_MERGED']).toContain(restoreRes.status);

    const restoredTask = await dataSource.manager.findOne(TaskEntityModel, {
      where: { id: taskId, userId: authUser.user.id }
    });
    expect(restoredTask?.deletedAt).toBeNull();

    // Subsequent cleanup run does NOT delete restored active task
    const cleanupRes = await repo.cleanTombstones({
      userId: authUser.user.id,
      retentionDays: 30,
      now: new Date('2026-09-30T12:00:00.000Z')
    });
    expect(cleanupRes.cleanedCount).toBe(0);

    const taskStillActive = await dataSource.manager.findOne(TaskEntityModel, {
      where: { id: taskId, userId: authUser.user.id }
    });
    expect(taskStillActive).not.toBeNull();
  });

  it('9. transaction rollback on cleanup failure', async () => {
    const taskId = 'task-rollback-on-failure';
    await createTestTask(taskId, {
      deletedAt: '2026-08-01T12:00:00.000Z'
    });

    // Attempt cleanup with an injected failure inside the transaction
    await expect(
      repo.cleanTombstones({
        userId: authUser.user.id,
        retentionDays: 30,
        now: new Date('2026-09-30T12:00:00.000Z'),
        onBeforeCommit: async () => {
          throw new Error('Simulated transactional failure');
        }
      })
    ).rejects.toThrow('Simulated transactional failure');

    // Verify task STILL exists in tasks table due to rollback
    const taskInDb = await dataSource.manager.findOne(TaskEntityModel, {
      where: { id: taskId, userId: authUser.user.id }
    });
    expect(taskInDb).not.toBeNull();
    expect(taskInDb?.id).toBe(taskId);

    // Verify NO record was committed to cleaned_tombstones
    const cleanedInDb = await dataSource.manager.findOne(CleanedTombstoneEntity, {
      where: { entityId: taskId, userId: authUser.user.id }
    });
    expect(cleanedInDb).toBeNull();
  });

  it('10. full HTTP flow: cleanup endpoint and resurrection prevention via push', async () => {
    const taskId = 'task-http-cleanup-flow';
    await createTestTask(taskId, {
      deletedAt: '2026-08-01T12:00:00.000Z'
    });

    // Call POST /api/v1/sync/cleanup via HTTP
    const cleanupRes = await request(app.getHttpServer())
      .post('/api/v1/sync/cleanup?retentionDays=30')
      .set('Authorization', bearer(authUser.accessToken));

    expect(cleanupRes.status).toBe(200);
    expect(cleanupRes.body.cleanedCount).toBe(1);
    expect(cleanupRes.body.cleanedTaskIds).toContain(taskId);

    // Now push a mutation for this task via HTTP
    const pushRes = await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set('Authorization', bearer(authUser.accessToken))
      .send({
        mutations: [
          {
            id: 'mut-http-resurrect',
            idempotencyKey: 'idemp-http-resurrect',
            entityType: 'TASK',
            entityId: taskId,
            operation: 'UPDATE',
            baseVersion: 1,
            payloadType: 'PARTIAL',
            payload: {
              title: 'Attempted HTTP resurrection'
            },
            fieldTimestamps: {
              title: '2026-10-01T12:00:00.000Z'
            },
            createdAt: '2026-10-01T12:00:00.000Z'
          }
        ]
      });

    expect(pushRes.status).toBe(200);
    expect(pushRes.body.results).toHaveLength(1);
    expect(pushRes.body.results[0].status).toBe('REJECTED');
  });
});
