import { describe, expect, it, vi } from 'vitest';
import type { MutationPayload, TaskEntity } from '@orbit/shared-types';
import {
  HttpSyncError,
  HttpSyncTransport,
  isRetryableHttpStatus
} from '@orbit/sync-engine';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function makeMutation(task: TaskEntity, overrides: Partial<MutationPayload> = {}): MutationPayload {
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
    createdAt: task.createdAt,
    ...overrides
  };
}

describe('isRetryableHttpStatus', () => {
  it('identifies 429 and 5xx as retryable', () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(502)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(504)).toBe(true);
  });

  it('identifies 4xx (except 429) as non-retryable', () => {
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(401)).toBe(false);
    expect(isRetryableHttpStatus(403)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isRetryableHttpStatus(409)).toBe(false);
  });
});

describe('HttpSyncTransport', () => {
  it('normalizes baseUrl by trimming trailing slashes', async () => {
    let requestedUrl = '';
    const mockFetcher = vi.fn(async (url: string | URL | Request) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ changes: [], nextCursor: 'c1', hasMore: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1///',
      fetcher: mockFetcher
    });

    await transport.pull(undefined, 10);
    expect(requestedUrl).toBe('https://api.orbit.app/v1/sync/pull?limit=10');
  });

  it('includes custom headers when provided', async () => {
    let capturedHeaders: Record<string, string> = {};
    const mockFetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      return new Response(JSON.stringify({ changes: [], nextCursor: 'c1', hasMore: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher,
      getHeaders: () => ({
        Authorization: 'Bearer test-token-123'
      })
    });

    await transport.pull('c_prev', 20);
    expect(capturedHeaders['Authorization']).toBe('Bearer test-token-123');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedHeaders['Accept']).toBe('application/json');
  });

  // ---- PULL ----

  it('pull successfully maps changes and cursor from GET response', async () => {
    const remoteTask = makeTask({ id: 'remote-1', title: 'Remote Task' });
    const mockFetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          changes: [remoteTask],
          nextCursor: 'cursor-42',
          hasMore: true
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher
    });

    const result = await transport.pull('cursor-41', 25);

    expect(mockFetcher).toHaveBeenCalledWith(
      'https://api.orbit.app/v1/sync/pull?cursor=cursor-41&limit=25',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.id).toBe('remote-1');
    expect(result.nextCursor).toBe('cursor-42');
    expect(result.hasMore).toBe(true);
  });

  it('pull handles 5xx as retryable HttpSyncError', async () => {
    const mockFetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({ message: 'Internal Server Error', code: 'INTERNAL_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher
    });

    await expect(transport.pull(undefined, 10)).rejects.toBeInstanceOf(HttpSyncError);
    await expect(transport.pull(undefined, 10)).rejects.toMatchObject({
      name: 'HttpSyncError',
      status: 500,
      isRetryable: true
    });
  });

  it('pull handles 4xx as non-retryable HttpSyncError', async () => {
    const mockFetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({ message: 'Forbidden', code: 'FORBIDDEN' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher
    });

    await expect(transport.pull(undefined, 10)).rejects.toMatchObject({
      name: 'HttpSyncError',
      status: 403,
      isRetryable: false
    });
  });

  // ---- PUSH ----

  it('push successfully sends mutations and maps response results', async () => {
    const task = makeTask({ id: 't1' });
    const mut = makeMutation(task, { id: 'm1' });

    let sentBody = '';
    const mockFetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      sentBody = String(init?.body);
      return new Response(
        JSON.stringify({
          results: [{ mutationId: 'm1', status: 'APPLIED' }]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher
    });

    const results = await transport.push([mut]);

    expect(JSON.parse(sentBody)).toEqual({ mutations: [mut] });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ mutationId: 'm1', status: 'APPLIED' });
  });

  it('push maps 5xx batch failure to RETRYABLE_ERROR results', async () => {
    const task1 = makeTask({ id: 't1' });
    const task2 = makeTask({ id: 't2' });
    const mut1 = makeMutation(task1, { id: 'm1' });
    const mut2 = makeMutation(task2, { id: 'm2' });

    const mockFetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({ message: 'Database unreachable', code: 'INTERNAL_ERROR' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher
    });

    const results = await transport.push([mut1, mut2]);

    expect(results).toHaveLength(2);
    expect(results[0]?.status).toBe('RETRYABLE_ERROR');
    expect(results[1]?.status).toBe('RETRYABLE_ERROR');
    expect(results[0]?.error).toContain('Database unreachable');
  });

  it('push maps 4xx batch failure to REJECTED results', async () => {
    const task = makeTask({ id: 't-bad' });
    const mut = makeMutation(task, { id: 'm-bad' });

    const mockFetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({ message: 'Validation failed', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher
    });

    const results = await transport.push([mut]);

    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('REJECTED');
    expect(results[0]?.error).toContain('Validation failed');
  });

  it('returns empty array when push is called with empty mutations array', async () => {
    const mockFetcher = vi.fn();
    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher
    });

    const results = await transport.push([]);
    expect(results).toEqual([]);
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it('handles network error by throwing retryable HttpSyncError', async () => {
    const mockFetcher = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher
    });

    const task = makeTask({ id: 't-fail' });
    const mut = makeMutation(task, { id: 'm-fail' });

    await expect(transport.push([mut])).rejects.toMatchObject({
      name: 'HttpSyncError',
      status: 0,
      isRetryable: true
    });
  });

  it('pull invokes onUnauthorized callback on 401 status', async () => {
    const onUnauthorized = vi.fn();
    const mockFetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher,
      onUnauthorized
    });

    await expect(transport.pull(undefined, 10)).rejects.toMatchObject({
      name: 'HttpSyncError',
      status: 401,
      isRetryable: false
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('push invokes onUnauthorized callback on 401 status', async () => {
    const onUnauthorized = vi.fn();
    const mockFetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    });

    const transport = new HttpSyncTransport({
      baseUrl: 'https://api.orbit.app/v1',
      fetcher: mockFetcher,
      onUnauthorized
    });

    const task = makeTask({ id: 't1' });
    const mut = makeMutation(task, { id: 'm1' });
    const results = await transport.push([mut]);

    expect(results[0]?.status).toBe('REJECTED');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
