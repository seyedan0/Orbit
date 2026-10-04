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
import { TaskEntityModel } from './database/entities/index.js';
import { bearer, deleteTestUsers, registerTestUser } from './testing/auth-test-helpers.js';

describe('Server Field-Level Conflict Resolution (LWW Integration)', () => {
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
    authUser = await registerTestUser(app, 'conflict-user');
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

  const createInitialTask = async (
    userId: string,
    taskId: string,
    overrides: Partial<MutationPayload['payload']> = {}
  ): Promise<void> => {
    const initMut: MutationPayload = {
      id: `mut-init-${taskId}`,
      idempotencyKey: `idemp-init-${taskId}`,
      entityType: 'TASK',
      entityId: taskId,
      operation: 'CREATE',
      baseVersion: 0,
      payloadType: 'FULL',
      payload: {
        projectId: 'inbox',
        title: 'Initial Title',
        kind: 'TASK',
        priority: 0,
        isAllDay: false,
        timeZone: 'UTC',
        startDate: undefined,
        dueDate: '2026-10-01T00:00:00.000Z',
        reminders: [],
        items: [],
        createdAt: '2026-10-02T10:00:00.000Z',
        updatedAt: '2026-10-02T10:00:00.000Z',
        ...overrides
      },
      fieldTimestamps: {
        title: '2026-10-02T10:00:00.000Z',
        dueDate: '2026-10-02T10:00:00.000Z'
      },
      createdAt: '2026-10-02T10:00:00.000Z'
    };

    const res = await repo.applyMutationAtomic(userId, initMut);
    expect(res.status).toBe('APPLIED');
  };

  describe('1. Concurrent edits on disjoint fields', () => {
    it('preserves both edits and marks second mutation as CONFLICT_MERGED', async () => {
      const taskId = 'task-disjoint-1';
      await createInitialTask(authUser.user.id, taskId);

      // Client A changes title (baseVersion 1)
      const mutA: MutationPayload = {
        id: 'mut-a-title',
        idempotencyKey: 'idemp-a-title',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: {
          title: 'Title Changed By Client A',
          updatedAt: '2026-10-02T10:05:00.000Z'
        },
        fieldTimestamps: {
          title: '2026-10-02T10:05:00.000Z'
        },
        createdAt: '2026-10-02T10:05:00.000Z'
      };

      const resA = await repo.applyMutationAtomic(authUser.user.id, mutA);
      expect(resA.status).toBe('APPLIED');
      expect(resA.task?.title).toBe('Title Changed By Client A');
      expect(resA.task?.dueDate).toBe('2026-10-01T00:00:00.000Z');
      expect(resA.task?.version).toBe(2);

      // Client B concurrently changes dueDate (also baseVersion 1)
      const mutB: MutationPayload = {
        id: 'mut-b-due',
        idempotencyKey: 'idemp-b-due',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1, // Divergent baseVersion
        payloadType: 'PARTIAL',
        payload: {
          dueDate: '2026-10-25T00:00:00.000Z',
          updatedAt: '2026-10-02T10:06:00.000Z'
        },
        fieldTimestamps: {
          dueDate: '2026-10-02T10:06:00.000Z'
        },
        createdAt: '2026-10-02T10:06:00.000Z'
      };

      const resB = await repo.applyMutationAtomic(authUser.user.id, mutB);
      expect(resB.status).toBe('CONFLICT_MERGED');
      expect(resB.task?.version).toBe(3);

      // Both fields preserved!
      expect(resB.task?.title).toBe('Title Changed By Client A');
      expect(resB.task?.dueDate).toBe('2026-10-25T00:00:00.000Z');

      // Verify directly in PostgreSQL
      const inDb = await dataSource.getRepository(TaskEntityModel).findOne({
        where: { id: taskId, userId: authUser.user.id }
      });
      expect(inDb).not.toBeNull();
      expect(inDb!.title).toBe('Title Changed By Client A');
      expect(inDb!.dueDate).toBe('2026-10-25T00:00:00.000Z');
      expect(inDb!.fieldTimestamps.title).toBe('2026-10-02T10:05:00.000Z');
      expect(inDb!.fieldTimestamps.dueDate).toBe('2026-10-02T10:06:00.000Z');
      expect(inDb!.lastMutationId).toBe('mut-b-due');
    });
  });

  describe('2. Concurrent edits on the same field (higher timestamp wins)', () => {
    it('ensures higher timestamp wins regardless of arrival order (Order 1: older then newer)', async () => {
      const taskId = 'task-same-field-1';
      await createInitialTask(authUser.user.id, taskId);

      // Mut Older (10:04)
      const mutOlder: MutationPayload = {
        id: 'mut-older',
        idempotencyKey: 'idemp-older',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: {
          title: 'Older Title (10:04)'
        },
        fieldTimestamps: {
          title: '2026-10-02T10:04:00.000Z'
        },
        createdAt: '2026-10-02T10:04:00.000Z'
      };

      // Mut Newer (10:08)
      const mutNewer: MutationPayload = {
        id: 'mut-newer',
        idempotencyKey: 'idemp-newer',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: {
          title: 'Newer Title (10:08)'
        },
        fieldTimestamps: {
          title: '2026-10-02T10:08:00.000Z'
        },
        createdAt: '2026-10-02T10:08:00.000Z'
      };

      const resOlder = await repo.applyMutationAtomic(authUser.user.id, mutOlder);
      expect(resOlder.status).toBe('APPLIED');
      expect(resOlder.task?.title).toBe('Older Title (10:04)');

      const resNewer = await repo.applyMutationAtomic(authUser.user.id, mutNewer);
      expect(resNewer.status).toBe('CONFLICT_MERGED');
      expect(resNewer.task?.title).toBe('Newer Title (10:08)'); // Higher timestamp won!
    });

    it('ensures higher timestamp wins regardless of arrival order (Order 2: newer then older)', async () => {
      const taskId = 'task-same-field-2';
      await createInitialTask(authUser.user.id, taskId);

      const mutNewer: MutationPayload = {
        id: 'mut-newer-2',
        idempotencyKey: 'idemp-newer-2',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: {
          title: 'Newer Title (10:08)'
        },
        fieldTimestamps: {
          title: '2026-10-02T10:08:00.000Z'
        },
        createdAt: '2026-10-02T10:08:00.000Z'
      };

      const mutOlder: MutationPayload = {
        id: 'mut-older-2',
        idempotencyKey: 'idemp-older-2',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: {
          title: 'Older Title (10:04)'
        },
        fieldTimestamps: {
          title: '2026-10-02T10:04:00.000Z'
        },
        createdAt: '2026-10-02T10:04:00.000Z'
      };

      // Newer arrives first
      const resNewer = await repo.applyMutationAtomic(authUser.user.id, mutNewer);
      expect(resNewer.status).toBe('APPLIED');
      expect(resNewer.task?.title).toBe('Newer Title (10:08)');

      // Older arrives second
      const resOlder = await repo.applyMutationAtomic(authUser.user.id, mutOlder);
      expect(resOlder.status).toBe('CONFLICT_MERGED');
      expect(resOlder.task?.title).toBe('Newer Title (10:08)'); // Newer title preserved!
    });
  });

  describe('3. Concurrent edits on the same field with identical timestamps (tie-breaker)', () => {
    const identicalTimestamp = '2026-10-02T10:10:00.000Z';

    it('decides deterministically with tie-breaker (mut-beta > mut-alpha)', async () => {
      const taskId = 'task-tie-breaker-1';
      await createInitialTask(authUser.user.id, taskId);

      const mutAlpha: MutationPayload = {
        id: 'mut-alpha-id',
        idempotencyKey: 'idemp-alpha',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: { title: 'Alpha Title' },
        fieldTimestamps: { title: identicalTimestamp },
        createdAt: identicalTimestamp
      };

      const mutBeta: MutationPayload = {
        id: 'mut-beta-id', // 'mut-beta-id' > 'mut-alpha-id'
        idempotencyKey: 'idemp-beta',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: { title: 'Beta Title' },
        fieldTimestamps: { title: identicalTimestamp },
        createdAt: identicalTimestamp
      };

      // Order 1: Alpha first, Beta second
      const resAlpha = await repo.applyMutationAtomic(authUser.user.id, mutAlpha);
      expect(resAlpha.status).toBe('APPLIED');
      expect(resAlpha.task?.title).toBe('Alpha Title');

      const resBeta = await repo.applyMutationAtomic(authUser.user.id, mutBeta);
      expect(resBeta.status).toBe('CONFLICT_MERGED');
      expect(resBeta.task?.title).toBe('Beta Title'); // Beta won tie-breaker!

      const inDb1 = await dataSource.getRepository(TaskEntityModel).findOne({
        where: { id: taskId, userId: authUser.user.id }
      });
      expect(inDb1?.lastMutationId).toBe('mut-beta-id');
    });

    it('produces the same winner if Beta arrives first and Alpha arrives second', async () => {
      const taskId = 'task-tie-breaker-2';
      await createInitialTask(authUser.user.id, taskId);

      const mutBeta: MutationPayload = {
        id: 'mut-beta-id',
        idempotencyKey: 'idemp-beta-2',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: { title: 'Beta Title' },
        fieldTimestamps: { title: identicalTimestamp },
        createdAt: identicalTimestamp
      };

      const mutAlpha: MutationPayload = {
        id: 'mut-alpha-id',
        idempotencyKey: 'idemp-alpha-2',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: { title: 'Alpha Title' },
        fieldTimestamps: { title: identicalTimestamp },
        createdAt: identicalTimestamp
      };

      // Order 2: Beta first, Alpha second
      const resBeta = await repo.applyMutationAtomic(authUser.user.id, mutBeta);
      expect(resBeta.status).toBe('APPLIED');
      expect(resBeta.task?.title).toBe('Beta Title');

      const resAlpha = await repo.applyMutationAtomic(authUser.user.id, mutAlpha);
      expect(resAlpha.status).toBe('CONFLICT_MERGED');
      expect(resAlpha.task?.title).toBe('Beta Title'); // Alpha lost tie-breaker, Beta preserved!

      const inDb2 = await dataSource.getRepository(TaskEntityModel).findOne({
        where: { id: taskId, userId: authUser.user.id }
      });
      expect(inDb2?.lastMutationId).toBe('mut-beta-id');
    });
  });

  describe('4. Deletion vs edit conflict based on timestamps (Rule 3)', () => {
    it('newer deletion prevails over concurrent older edit', async () => {
      const taskId = 'task-del-vs-edit-1';
      await createInitialTask(authUser.user.id, taskId);

      // Client A soft-deletes at 10:15
      const deleteMut: MutationPayload = {
        id: 'mut-del-1',
        idempotencyKey: 'idemp-del-1',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'DELETE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: {
          deletedAt: '2026-10-02T10:15:00.000Z'
        },
        fieldTimestamps: {
          deletedAt: '2026-10-02T10:15:00.000Z'
        },
        createdAt: '2026-10-02T10:15:00.000Z'
      };

      // Client B concurrently edited at 10:10
      const editMut: MutationPayload = {
        id: 'mut-edit-1',
        idempotencyKey: 'idemp-edit-1',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: {
          title: 'Title while deleted'
        },
        fieldTimestamps: {
          title: '2026-10-02T10:10:00.000Z'
        },
        createdAt: '2026-10-02T10:10:00.000Z'
      };

      const resDel = await repo.applyMutationAtomic(authUser.user.id, deleteMut);
      expect(resDel.status).toBe('APPLIED');
      expect(resDel.task?.deletedAt).toBe('2026-10-02T10:15:00.000Z');

      const resEdit = await repo.applyMutationAtomic(authUser.user.id, editMut);
      expect(resEdit.status).toBe('CONFLICT_MERGED');
      // Task remains soft-deleted, but title is updated
      expect(resEdit.task?.deletedAt).toBe('2026-10-02T10:15:00.000Z');
      expect(resEdit.task?.title).toBe('Title while deleted');
    });

    it('newer restore resurrects soft-deleted task', async () => {
      const taskId = 'task-del-vs-edit-2';
      await createInitialTask(authUser.user.id, taskId);

      // 1. Delete at 10:10
      const deleteMut: MutationPayload = {
        id: 'mut-del-2',
        idempotencyKey: 'idemp-del-2',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'DELETE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: { deletedAt: '2026-10-02T10:10:00.000Z' },
        fieldTimestamps: { deletedAt: '2026-10-02T10:10:00.000Z' },
        createdAt: '2026-10-02T10:10:00.000Z'
      };
      await repo.applyMutationAtomic(authUser.user.id, deleteMut);

      // 2. Restore at 10:20 (newer than deletion)
      const restoreMut: MutationPayload = {
        id: 'mut-restore-2',
        idempotencyKey: 'idemp-restore-2',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'UPDATE',
        baseVersion: 2,
        payloadType: 'PARTIAL',
        payload: { deletedAt: null },
        fieldTimestamps: { deletedAt: '2026-10-02T10:20:00.000Z' },
        createdAt: '2026-10-02T10:20:00.000Z'
      };

      const resRestore = await repo.applyMutationAtomic(authUser.user.id, restoreMut);
      expect(resRestore.status).toBe('APPLIED');
      expect(resRestore.task?.deletedAt).toBeNull(); // Restored!

      // 3. Stale delete from 10:12 arriving later
      const staleDeleteMut: MutationPayload = {
        id: 'mut-stale-del-3',
        idempotencyKey: 'idemp-stale-del-3',
        entityType: 'TASK',
        entityId: taskId,
        operation: 'DELETE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: { deletedAt: '2026-10-02T10:12:00.000Z' },
        fieldTimestamps: { deletedAt: '2026-10-02T10:12:00.000Z' },
        createdAt: '2026-10-02T10:12:00.000Z'
      };

      const resStaleDel = await repo.applyMutationAtomic(authUser.user.id, staleDeleteMut);
      expect(resStaleDel.status).toBe('CONFLICT_MERGED');
      expect(resStaleDel.task?.deletedAt).toBeNull(); // Stale delete lost, task remains restored!
    });
  });

  describe('5. Full HTTP Push/Pull Flow for Conflict Merged State', () => {
    it('returns CONFLICT_MERGED status in push endpoint and pulls resolved state', async () => {
      const taskId = 'task-http-conflict-1';
      await createInitialTask(authUser.user.id, taskId);

      // Push Mutation 1: Client A edits title
      const pushResA = await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('Authorization', bearer(authUser.accessToken))
        .send({
          mutations: [
            {
              id: 'mut-http-a',
              idempotencyKey: 'key-http-a',
              entityType: 'TASK',
              entityId: taskId,
              operation: 'UPDATE',
              baseVersion: 1,
              payloadType: 'PARTIAL',
              payload: { title: 'HTTP Title Client A' },
              fieldTimestamps: { title: '2026-10-02T10:10:00.000Z' },
              createdAt: '2026-10-02T10:10:00.000Z'
            }
          ]
        });

      expect(pushResA.status).toBe(200);
      expect(pushResA.body.results).toEqual([
        { mutationId: 'mut-http-a', status: 'APPLIED' }
      ]);

      // Push Mutation 2: Client B concurrently edits dueDate (baseVersion 1)
      const pushResB = await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('Authorization', bearer(authUser.accessToken))
        .send({
          mutations: [
            {
              id: 'mut-http-b',
              idempotencyKey: 'key-http-b',
              entityType: 'TASK',
              entityId: taskId,
              operation: 'UPDATE',
              baseVersion: 1, // Divergent
              payloadType: 'PARTIAL',
              payload: { dueDate: '2026-10-30T00:00:00.000Z' },
              fieldTimestamps: { dueDate: '2026-10-02T10:12:00.000Z' },
              createdAt: '2026-10-02T10:12:00.000Z'
            }
          ]
        });

      expect(pushResB.status).toBe(200);
      expect(pushResB.body.results).toEqual([
        { mutationId: 'mut-http-b', status: 'CONFLICT_MERGED' }
      ]);

      // Pull changes: should return merged task with both fields preserved
      const pullRes = await request(app.getHttpServer())
        .get('/api/v1/sync/pull?cursor=0&limit=10')
        .set('Authorization', bearer(authUser.accessToken));

      expect(pullRes.status).toBe(200);
      expect(pullRes.body.changes).toHaveLength(1);
      const mergedTask = pullRes.body.changes[0];
      expect(mergedTask.title).toBe('HTTP Title Client A');
      expect(mergedTask.dueDate).toBe('2026-10-30T00:00:00.000Z');
      expect(mergedTask.version).toBe(3);
    });
  });
});
