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
import { SyncMutationEntity, TaskEntityModel } from './database/entities/index.js';
import { bearer, deleteTestUsers, registerTestUser } from './testing/auth-test-helpers.js';

describe('PostgreSQL Sync Repository & Schema Integration', () => {
  let app: INestApplication;
  let repo: PostgresSyncRepository;
  let dataSource: DataSource;
  let httpUser: AuthResponse;

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
    httpUser = await registerTestUser(app, 'pg-http');
  });

  afterAll(async () => {
    if (repo) {
      await repo.clear();
    }
    if (dataSource && httpUser) {
      await deleteTestUsers(dataSource, [httpUser.user.id]);
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await repo.clear();
  });

  const createMutation = (overrides: Partial<MutationPayload> = {}): MutationPayload => ({
    id: 'b5a1f6a1-0000-4000-8000-000000000001',
    idempotencyKey: 'idemp-pg-1',
    entityType: 'TASK',
    entityId: 'c1b2c3d4-0000-4000-8000-000000000001',
    operation: 'CREATE',
    baseVersion: 0,
    payloadType: 'FULL',
    payload: {
      projectId: 'inbox',
      title: 'PostgreSQL Sync Task',
      kind: 'TASK',
      priority: 1,
      isAllDay: false,
      timeZone: 'UTC',
      reminders: ['2026-10-01T09:00:00.000Z'],
      items: [{ id: 'sub-1', title: 'Subtask 1', isCompleted: false, order: 1 }],
      createdAt: '2026-09-30T10:00:00.000Z',
      updatedAt: '2026-09-30T10:00:00.000Z'
    },
    fieldTimestamps: {
      title: '2026-09-30T10:00:00.000Z'
    },
    createdAt: '2026-09-30T10:00:00.000Z',
    ...overrides
  });

  describe('Database Constraints & Schema Verification', () => {
    it('persists task and sync mutation entities in PostgreSQL with proper mapping', async () => {
      const mut = createMutation();
      const res = await repo.applyMutationAtomic('user-pg-1', mut);

      expect(res.status).toBe('APPLIED');
      expect(res.task).toBeDefined();
      expect(res.task!.id).toBe(mut.entityId);
      expect(res.task!.title).toBe('PostgreSQL Sync Task');
      expect(res.task!.version).toBe(1);
      expect(res.task!.priority).toBe(1);
      expect(res.task!.items).toHaveLength(1);

      // Verify directly from PostgreSQL via TypeORM repositories
      const taskInDb = await dataSource.getRepository(TaskEntityModel).findOne({
        where: { id: mut.entityId, userId: 'user-pg-1' }
      });
      expect(taskInDb).not.toBeNull();
      expect(taskInDb!.id).toBe(mut.entityId);
      expect(taskInDb!.cursor).toBeDefined();

      const mutationInDb = await dataSource.getRepository(SyncMutationEntity).findOne({
        where: { userId: 'user-pg-1', idempotencyKey: mut.idempotencyKey }
      });
      expect(mutationInDb).not.toBeNull();
      expect(mutationInDb!.operation).toBe('CREATE');
    });

    it('enforces idempotency unique constraint (user_id, idempotency_key)', async () => {
      const mut = createMutation({ idempotencyKey: 'idemp-unique-test' });

      // First application: APPLIED
      const first = await repo.applyMutationAtomic('user-pg-1', mut);
      expect(first.status).toBe('APPLIED');

      // Second application with identical idempotencyKey: ALREADY_APPLIED
      const second = await repo.applyMutationAtomic('user-pg-1', mut);
      expect(second.status).toBe('ALREADY_APPLIED');

      // Only one mutation row should exist in the database
      const count = await dataSource.getRepository(SyncMutationEntity).count({
        where: { userId: 'user-pg-1', idempotencyKey: 'idemp-unique-test' }
      });
      expect(count).toBe(1);

      // Distinct user can reuse the same idempotencyKey
      const otherUser = await repo.applyMutationAtomic('user-pg-2', mut);
      expect(otherUser.status).toBe('APPLIED');
    });
  });

  describe('Atomic Transactions', () => {
    it('applies task update and mutation record within a single atomic transaction', async () => {
      // 1. Create task
      const createMut = createMutation({
        id: 'mut-atom-1',
        idempotencyKey: 'key-atom-1',
        entityId: 'task-atom-1'
      });
      await repo.applyMutationAtomic('user-atom', createMut);

      // 2. Update task
      const updateMut: MutationPayload = {
        id: 'mut-atom-2',
        idempotencyKey: 'key-atom-2',
        entityType: 'TASK',
        entityId: 'task-atom-1',
        operation: 'UPDATE',
        baseVersion: 1,
        payloadType: 'PARTIAL',
        payload: {
          title: 'Updated Atomic Title',
          updatedAt: '2026-09-30T10:10:00.000Z'
        },
        fieldTimestamps: {
          title: '2026-09-30T10:10:00.000Z'
        },
        createdAt: '2026-09-30T10:10:00.000Z'
      };

      const updateRes = await repo.applyMutationAtomic('user-atom', updateMut);
      expect(updateRes.status).toBe('APPLIED');
      expect(updateRes.task?.title).toBe('Updated Atomic Title');
      expect(updateRes.task?.version).toBe(2);

      // 3. Delete task (soft delete)
      const deleteMut: MutationPayload = {
        id: 'mut-atom-3',
        idempotencyKey: 'key-atom-3',
        entityType: 'TASK',
        entityId: 'task-atom-1',
        operation: 'DELETE',
        baseVersion: 2,
        payloadType: 'PARTIAL',
        payload: {
          deletedAt: '2026-09-30T10:15:00.000Z',
          updatedAt: '2026-09-30T10:15:00.000Z'
        },
        fieldTimestamps: {},
        createdAt: '2026-09-30T10:15:00.000Z'
      };

      const deleteRes = await repo.applyMutationAtomic('user-atom', deleteMut);
      expect(deleteRes.status).toBe('APPLIED');
      expect(deleteRes.task?.deletedAt).toBe('2026-09-30T10:15:00.000Z');
      expect(deleteRes.task?.version).toBe(3);
    });

    it('rolls back task and mutation atomically if transaction encounters an error', async () => {
      let threw = false;
      try {
        await dataSource.transaction(async (manager) => {
          await manager.save(TaskEntityModel, {
            id: 'rollback-task-1',
            projectId: 'inbox',
            userId: 'user-rollback',
            title: 'Uncommitted Task',
            kind: 'TASK',
            priority: 0,
            isAllDay: false,
            timeZone: 'UTC',
            reminders: [],
            items: [],
            version: 1,
            localStatus: 'SYNCED',
            cursor: '999999',
            createdAt: '2026-09-30T10:00:00.000Z',
            updatedAt: '2026-09-30T10:00:00.000Z',
            fieldTimestamps: {}
          } as TaskEntityModel);

          await manager.save(SyncMutationEntity, {
            id: 'rollback-mut-1',
            userId: 'user-rollback',
            idempotencyKey: 'rollback-idemp-1',
            entityType: 'TASK',
            entityId: 'rollback-task-1',
            operation: 'CREATE',
            baseVersion: 0,
            payloadType: 'FULL',
            payload: {},
            fieldTimestamps: {},
            createdAt: '2026-09-30T10:00:00.000Z'
          } as SyncMutationEntity);

          throw new Error('Simulated atomic failure');
        });
      } catch (err: unknown) {
        threw = true;
        expect((err as Error).message).toBe('Simulated atomic failure');
      }

      expect(threw).toBe(true);

      const task = await dataSource.getRepository(TaskEntityModel).findOne({
        where: { id: 'rollback-task-1' }
      });
      expect(task).toBeNull();

      const mutation = await dataSource.getRepository(SyncMutationEntity).findOne({
        where: { id: 'rollback-mut-1' }
      });
      expect(mutation).toBeNull();
    });
  });

  describe('Pull changes & cursor-based pagination', () => {
    it('tracks cursor monotonically and pages changes properly', async () => {
      // Create 3 tasks
      for (let i = 1; i <= 3; i++) {
        await repo.applyMutationAtomic(
          'user-cursor-test',
          createMutation({
            id: `mut-c-${i}`,
            idempotencyKey: `idemp-c-${i}`,
            entityId: `task-c-${i}`,
            payload: {
              title: `Task #${i}`,
              createdAt: '2026-09-30T10:00:00.000Z',
              updatedAt: '2026-09-30T10:00:00.000Z'
            }
          })
        );
      }

      // Initial pull with limit 2
      const page1 = await repo.getChanges('user-cursor-test', '0', 2);
      expect(page1.changes).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.changes[0].title).toBe('Task #1');
      expect(page1.changes[1].title).toBe('Task #2');

      // Next page with nextCursor
      const page2 = await repo.getChanges('user-cursor-test', page1.nextCursor, 2);
      expect(page2.changes).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
      expect(page2.changes[0].title).toBe('Task #3');

      // No changes after last cursor
      const emptyPage = await repo.getChanges('user-cursor-test', page2.nextCursor, 10);
      expect(emptyPage.changes).toHaveLength(0);
      expect(emptyPage.hasMore).toBe(false);
    });

    it('isolates tasks between users in PostgreSQL', async () => {
      await repo.applyMutationAtomic(
        'alice',
        createMutation({
          id: 'mut-alice',
          idempotencyKey: 'idemp-alice',
          entityId: 'task-alice'
        })
      );

      const bobPull = await repo.getChanges('bob', '0', 10);
      expect(bobPull.changes).toHaveLength(0);

      const alicePull = await repo.getChanges('alice', '0', 10);
      expect(alicePull.changes).toHaveLength(1);
      expect(alicePull.changes[0].id).toBe('task-alice');
    });
  });

  describe('Full HTTP Sync Endpoints against PostgreSQL', () => {
    it('executes push and pull over HTTP with database persistence', async () => {
      const mutation = createMutation({
        id: 'http-mut-1',
        idempotencyKey: 'http-idemp-1',
        entityId: 'http-task-1',
        payload: {
          title: 'Full HTTP Flow Task'
        }
      });

      // POST /api/v1/sync/push
      const pushRes = await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('Authorization', bearer(httpUser.accessToken))
        .send({ mutations: [mutation] });

      expect(pushRes.status).toBe(200);
      expect(pushRes.body.results).toEqual([
        { mutationId: 'http-mut-1', status: 'APPLIED' }
      ]);

      // GET /api/v1/sync/pull
      const pullRes = await request(app.getHttpServer())
        .get('/api/v1/sync/pull?cursor=0&limit=10')
        .set('Authorization', bearer(httpUser.accessToken));

      expect(pullRes.status).toBe(200);
      expect(pullRes.body.changes).toHaveLength(1);
      expect(pullRes.body.changes[0].title).toBe('Full HTTP Flow Task');
      expect(pullRes.body.hasMore).toBe(false);
    });
  });
});
