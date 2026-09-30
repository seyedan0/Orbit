import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { MutationPayload } from '@orbit/shared-types';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { SYNC_REPOSITORY } from './sync/interfaces/sync-repository.interface.js';
import { InMemorySyncRepository } from './sync/repositories/in-memory-sync.repository.js';

describe('Server Sync Foundation (E2E)', () => {
  let app: INestApplication;
  let syncRepo: InMemorySyncRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    syncRepo = moduleRef.get<InMemorySyncRepository>(SYNC_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    syncRepo.clear();
  });

  describe('Health check', () => {
    it('returns status ok and version 0.1.0', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        version: '0.1.0'
      });
    });
  });

  describe('Error formatting', () => {
    it('formats not found error with code, message, and requestId', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: 'NOT_FOUND',
        message: expect.any(String),
        requestId: expect.any(String)
      });
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('formats validation error on malformed push request body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .send({ notMutations: true });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('mutations'),
        requestId: expect.any(String)
      });
    });
  });

  describe('Sync Push', () => {
    const makeValidMutation = (overrides: Partial<MutationPayload> = {}): MutationPayload => ({
      id: 'mut-1',
      idempotencyKey: 'idemp-1',
      entityType: 'TASK',
      entityId: 'task-1',
      operation: 'CREATE',
      baseVersion: 0,
      payloadType: 'FULL',
      payload: {
        title: 'Learn NestJS'
      },
      fieldTimestamps: {
        title: '2026-09-30T10:00:00.000Z'
      },
      createdAt: '2026-09-30T10:00:00.000Z',
      ...overrides
    });

    it('pushes mutations batch with valid payload and returns APPLIED', async () => {
      const mutation1 = makeValidMutation({ id: 'm1', idempotencyKey: 'k1', entityId: 't1' });
      const mutation2 = makeValidMutation({ id: 'm2', idempotencyKey: 'k2', entityId: 't2' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('x-user-id', 'user-1')
        .send({ mutations: [mutation1, mutation2] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        results: [
          { mutationId: 'm1', status: 'APPLIED' },
          { mutationId: 'm2', status: 'APPLIED' }
        ]
      });
    });

    it('enforces idempotency and returns ALREADY_APPLIED for duplicate idempotencyKey', async () => {
      const mutation = makeValidMutation({ id: 'm1', idempotencyKey: 'same-key', entityId: 't1' });

      const firstRes = await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('x-user-id', 'user-1')
        .send({ mutations: [mutation] });

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.results).toEqual([
        { mutationId: 'm1', status: 'APPLIED' }
      ]);

      // Send same mutation again with identical idempotencyKey
      const secondRes = await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('x-user-id', 'user-1')
        .send({ mutations: [mutation] });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.results).toEqual([
        { mutationId: 'm1', status: 'ALREADY_APPLIED' }
      ]);
    });

    it('returns REJECTED for invalid mutations in batch without failing valid ones', async () => {
      const validMut = makeValidMutation({ id: 'valid-1', idempotencyKey: 'k-valid', entityId: 't-valid' });
      const invalidMut = {
        id: 'invalid-1',
        idempotencyKey: 'k-invalid',
        entityType: 'UNKNOWN_ENTITY', // Invalid
        entityId: '',
        operation: 'INVALID_OP',
        payload: null
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('x-user-id', 'user-1')
        .send({ mutations: [validMut, invalidMut] });

      expect(res.status).toBe(200);
      expect(res.body.results).toEqual([
        { mutationId: 'valid-1', status: 'APPLIED' },
        { mutationId: 'invalid-1', status: 'REJECTED' }
      ]);
    });
  });

  describe('Sync Pull and cursor progression', () => {
    it('pulls changes with cursor progression and hasMore indicator', async () => {
      // 1. Initial pull with no changes
      const initialPull = await request(app.getHttpServer())
        .get('/api/v1/sync/pull')
        .set('x-user-id', 'user-1');

      expect(initialPull.status).toBe(200);
      expect(initialPull.body).toEqual({
        changes: [],
        nextCursor: '0',
        hasMore: false
      });

      // 2. Push task 1
      await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('x-user-id', 'user-1')
        .send({
          mutations: [
            {
              id: 'm1',
              idempotencyKey: 'k1',
              entityType: 'TASK',
              entityId: 't1',
              operation: 'CREATE',
              baseVersion: 0,
              payloadType: 'FULL',
              payload: { title: 'First Task' },
              fieldTimestamps: {},
              createdAt: '2026-09-30T10:00:00.000Z'
            }
          ]
        });

      // 3. Push task 2
      await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('x-user-id', 'user-1')
        .send({
          mutations: [
            {
              id: 'm2',
              idempotencyKey: 'k2',
              entityType: 'TASK',
              entityId: 't2',
              operation: 'CREATE',
              baseVersion: 0,
              payloadType: 'FULL',
              payload: { title: 'Second Task' },
              fieldTimestamps: {},
              createdAt: '2026-09-30T10:01:00.000Z'
            }
          ]
        });

      // 4. Pull page 1 (limit 1)
      const page1 = await request(app.getHttpServer())
        .get('/api/v1/sync/pull?cursor=0&limit=1')
        .set('x-user-id', 'user-1');

      expect(page1.status).toBe(200);
      expect(page1.body.changes).toHaveLength(1);
      expect(page1.body.changes[0].title).toBe('First Task');
      expect(page1.body.nextCursor).toBe('1');
      expect(page1.body.hasMore).toBe(true);

      // 5. Pull page 2 (from nextCursor 1, limit 1)
      const page2 = await request(app.getHttpServer())
        .get(`/api/v1/sync/pull?cursor=${page1.body.nextCursor}&limit=1`)
        .set('x-user-id', 'user-1');

      expect(page2.status).toBe(200);
      expect(page2.body.changes).toHaveLength(1);
      expect(page2.body.changes[0].title).toBe('Second Task');
      expect(page2.body.nextCursor).toBe('2');
      expect(page2.body.hasMore).toBe(false);

      // 6. Pull again from cursor 2
      const emptyPull = await request(app.getHttpServer())
        .get(`/api/v1/sync/pull?cursor=${page2.body.nextCursor}&limit=10`)
        .set('x-user-id', 'user-1');

      expect(emptyPull.status).toBe(200);
      expect(emptyPull.body.changes).toHaveLength(0);
      expect(emptyPull.body.nextCursor).toBe('2');
      expect(emptyPull.body.hasMore).toBe(false);
    });

    it('isolates sync data between different users', async () => {
      // User A creates a task
      await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('x-user-id', 'user-a')
        .send({
          mutations: [
            {
              id: 'ma',
              idempotencyKey: 'ka',
              entityType: 'TASK',
              entityId: 'ta',
              operation: 'CREATE',
              baseVersion: 0,
              payloadType: 'FULL',
              payload: { title: 'Secret Task A' },
              fieldTimestamps: {},
              createdAt: '2026-09-30T10:00:00.000Z'
            }
          ]
        });

      // User B pulls
      const userBPull = await request(app.getHttpServer())
        .get('/api/v1/sync/pull')
        .set('x-user-id', 'user-b');

      expect(userBPull.status).toBe(200);
      expect(userBPull.body.changes).toHaveLength(0);
    });

    it('pulls soft-deleted tasks with deletedAt flag', async () => {
      // Create then delete
      await request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set('x-user-id', 'user-1')
        .send({
          mutations: [
            {
              id: 'm1',
              idempotencyKey: 'k1',
              entityType: 'TASK',
              entityId: 't1',
              operation: 'CREATE',
              baseVersion: 0,
              payloadType: 'FULL',
              payload: { title: 'Task to be deleted' },
              fieldTimestamps: {},
              createdAt: '2026-09-30T10:00:00.000Z'
            },
            {
              id: 'm2',
              idempotencyKey: 'k2',
              entityType: 'TASK',
              entityId: 't1',
              operation: 'DELETE',
              baseVersion: 1,
              payloadType: 'PARTIAL',
              payload: { deletedAt: '2026-09-30T10:05:00.000Z' },
              fieldTimestamps: {},
              createdAt: '2026-09-30T10:05:00.000Z'
            }
          ]
        });

      const pullRes = await request(app.getHttpServer())
        .get('/api/v1/sync/pull')
        .set('x-user-id', 'user-1');

      expect(pullRes.status).toBe(200);
      expect(pullRes.body.changes).toHaveLength(2);
      expect(pullRes.body.changes[1].deletedAt).toBe('2026-09-30T10:05:00.000Z');
    });
  });
});
