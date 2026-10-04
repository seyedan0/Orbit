import { beforeEach, describe, expect, it } from 'vitest';
import type { SyncQueueEntry, TaskEntity } from '@orbit/shared-types';
import {
  FakeSyncTransport,
  InMemorySyncTelemetry,
  NoopSyncTelemetry,
  SyncRuntime,
  type SyncTelemetry
} from '@orbit/sync-engine';
import { MemoryLocalStore } from '../storage/memory-local-store.js';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  const PAST = '2026-01-01T00:00:00.000Z';
  return {
    id: overrides.id ?? 'task-telemetry-1',
    projectId: 'inbox',
    userId: 'user-scope-1',
    title: overrides.title ?? 'Confidential Task Title That Must Not Leak',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    timeZone: 'UTC',
    reminders: [],
    items: [],
    version: 1,
    localStatus: 'CREATED',
    createdAt: overrides.createdAt ?? PAST,
    updatedAt: overrides.updatedAt ?? PAST,
    ...overrides
  };
}

function makeMutation(task: TaskEntity, overrides: Partial<SyncQueueEntry> = {}): SyncQueueEntry {
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
    createdAt: overrides.createdAt ?? task.createdAt,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: overrides.nextAttemptAt ?? '2020-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('Sync Health Telemetry (P3-SYNC-004)', () => {
  let store: MemoryLocalStore;
  let transport: FakeSyncTransport;
  let currentTime: Date;

  beforeEach(() => {
    currentTime = new Date('2026-10-01T12:00:00.000Z');
    store = new MemoryLocalStore(() => currentTime);
    transport = new FakeSyncTransport();
  });

  // =========================================================================
  // 1. Optional & No-op Telemetry by Default
  // =========================================================================
  describe('Optional and no-op default', () => {
    it('runs sync cycle successfully when telemetry is omitted', async () => {
      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime
      });

      const task = makeTask({ id: 'task-def-1' });
      transport.addServerTask(task);
      await store.enqueueMutation(makeMutation(task));

      const result = await runtime.syncOnce();
      expect(result.pull.appliedCount).toBe(1);
      expect(result.push.succeededCount).toBe(1);
    });

    it('runs sync cycle successfully with explicit NoopSyncTelemetry', async () => {
      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime,
        telemetry: new NoopSyncTelemetry()
      });

      const task = makeTask({ id: 'task-noop-1' });
      transport.addServerTask(task);

      const result = await runtime.pullOnce();
      expect(result.appliedCount).toBe(1);
    });
  });

  // =========================================================================
  // 2. Resilience: Broken Collector Never Breaks Sync
  // =========================================================================
  describe('Collector error tolerance (fail-safe)', () => {
    it('does not throw or break sync when every telemetry method throws an error', async () => {
      const throwingTelemetry: SyncTelemetry = {
        recordMetric: () => {
          throw new Error('Telemetry recordMetric boom');
        },
        recordEvent: () => {
          throw new Error('Telemetry recordEvent boom');
        },
        onSyncCycleStarted: () => {
          throw new Error('Telemetry onSyncCycleStarted boom');
        },
        onSyncCycleCompleted: () => {
          throw new Error('Telemetry onSyncCycleCompleted boom');
        },
        onSyncCycleFailed: () => {
          throw new Error('Telemetry onSyncCycleFailed boom');
        },
        onPushBatch: () => {
          throw new Error('Telemetry onPushBatch boom');
        },
        onPullBatch: () => {
          throw new Error('Telemetry onPullBatch boom');
        },
        onInFlightRecovery: () => {
          throw new Error('Telemetry onInFlightRecovery boom');
        }
      };

      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime,
        telemetry: throwingTelemetry
      });

      const task = makeTask({ id: 'task-throw-1' });
      transport.addServerTask(task);
      await store.enqueueMutation(makeMutation(task));

      // syncOnce should complete cleanly despite throwing collector
      const result = await runtime.syncOnce();
      expect(result.pull.appliedCount).toBe(1);
      expect(result.push.succeededCount).toBe(1);

      // In-flight recovery should complete cleanly despite throwing collector
      const recResult = await runtime.recoverInFlightMutations();
      expect(recResult.recoveredCount).toBe(0);
    });

    it('preserves underlying transport error when sync fails, without collector interference', async () => {
      const throwingTelemetry: SyncTelemetry = {
        recordMetric: () => {
          throw new Error('Collector recordMetric failed');
        },
        onSyncCycleFailed: () => {
          throw new Error('Collector onSyncCycleFailed failed');
        }
      };

      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime,
        telemetry: throwingTelemetry
      });

      // Transport pull will fail
      transport.pull = async () => {
        throw new Error('Network transport offline');
      };

      await expect(runtime.syncOnce()).rejects.toThrow('Network transport offline');
    });
  });

  // =========================================================================
  // 3. In-Memory Telemetry: Metric and Event Verification
  // =========================================================================
  describe('InMemorySyncTelemetry event and metric tracking', () => {
    it('tracks successful sync cycle, pull, and push with full metrics and events', async () => {
      const telemetry = new InMemorySyncTelemetry();
      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime,
        telemetry,
        userScope: 'tenant-user-alpha',
        requestId: 'req-test-42'
      });

      // Prepare server changes (one with updatedAt 5 seconds before currentTime)
      const fiveSecBefore = new Date(currentTime.getTime() - 5000).toISOString();
      const serverTaskA = makeTask({ id: 'srv-a', updatedAt: fiveSecBefore });
      const serverTaskB = makeTask({ id: 'srv-b', updatedAt: fiveSecBefore });
      transport.addServerTask(serverTaskA);
      transport.addServerTask(serverTaskB);

      // Prepare 2 local mutations: 1 normal, 1 conflict merged
      const localTask1 = makeTask({ id: 'loc-1' });
      const localTask2 = makeTask({ id: 'loc-2' });
      await store.enqueueMutation(makeMutation(localTask1, { id: 'm-1' }));
      await store.enqueueMutation(makeMutation(localTask2, { id: 'm-2' }));
      transport.forcedPushStatuses.set('m-2', 'CONFLICT_MERGED');

      const result = await runtime.syncOnce({
        requestId: 'req-invocation-99',
        userScope: 'tenant-user-alpha'
      });

      expect(result.pull.appliedCount).toBe(2);
      expect(result.push.succeededCount).toBe(2);
      expect(result.push.conflictMergedCount).toBe(1);

      // 1. Verify Events
      const startEvents = telemetry.getEvents('sync_cycle_started');
      expect(startEvents).toHaveLength(1);
      expect(startEvents[0]?.syncId).toBeDefined();
      expect(startEvents[0]?.userScope).toBe('tenant-user-alpha');
      expect(startEvents[0]?.requestId).toBe('req-invocation-99');

      const pullEvents = telemetry.getEvents('pull_batch');
      expect(pullEvents).toHaveLength(1);
      expect(pullEvents[0]?.batchSize).toBe(2);
      expect(pullEvents[0]?.appliedCount).toBe(2);
      expect(pullEvents[0]?.hasMore).toBe(false);
      expect(pullEvents[0]?.cursorLag).toBeGreaterThanOrEqual(5);

      const pushEvents = telemetry.getEvents('push_batch');
      expect(pushEvents).toHaveLength(1);
      expect(pushEvents[0]?.batchSize).toBe(2);
      expect(pushEvents[0]?.succeededCount).toBe(2);
      expect(pushEvents[0]?.conflictMergedCount).toBe(1);
      expect(pushEvents[0]?.mutationIds).toEqual(['m-1', 'm-2']);

      const completeEvents = telemetry.getEvents('sync_cycle_completed');
      expect(completeEvents).toHaveLength(1);
      expect(completeEvents[0]?.pushBatchSize).toBe(2);
      expect(completeEvents[0]?.pullBatchSize).toBe(2);
      expect(completeEvents[0]?.conflictMergedCount).toBe(1);
      expect(completeEvents[0]?.pendingMutationCount).toBe(2);
      expect(completeEvents[0]?.durationMs).toBeGreaterThanOrEqual(0);
      expect(completeEvents[0]?.cursorLag).toBeGreaterThanOrEqual(5);

      // 2. Verify Metrics
      expect(telemetry.getLastMetricValue('sync_cycle_started')).toBe(1);
      expect(telemetry.getLastMetricValue('sync_cycle_completed')).toBe(1);
      expect(telemetry.getLastMetricValue('push_batch_size')).toBe(2);
      expect(telemetry.getLastMetricValue('pull_batch_size')).toBe(2);
      expect(telemetry.getLastMetricValue('pending_mutation_count')).toBe(2);
      expect(telemetry.getLastMetricValue('conflict_merged_count')).toBe(1);
      expect(telemetry.getLastMetricValue('cursor_lag')).toBeGreaterThanOrEqual(5);
      expect(telemetry.getLastMetricValue('sync_duration_ms')).toBeGreaterThanOrEqual(0);
    });

    it('tracks sync cycle failure during pull phase', async () => {
      const telemetry = new InMemorySyncTelemetry();
      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime,
        telemetry,
        userScope: 'tenant-beta'
      });

      transport.pull = async () => {
        throw new Error('Connection refused by server');
      };

      await expect(runtime.syncOnce()).rejects.toThrow('Connection refused');

      const failedEvents = telemetry.getEvents('sync_cycle_failed');
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0]?.phase).toBe('PULL');
      expect(failedEvents[0]?.error).toBe('Connection refused by server');
      expect(failedEvents[0]?.userScope).toBe('tenant-beta');

      expect(telemetry.getLastMetricValue('sync_cycle_failed')).toBe(1);
      expect(telemetry.getLastMetricValue('sync_duration_ms')).toBeGreaterThanOrEqual(0);
    });

    it('tracks sync cycle failure during push phase', async () => {
      const telemetry = new InMemorySyncTelemetry();
      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime,
        telemetry
      });

      const task = makeTask({ id: 'loc-fail' });
      await store.enqueueMutation(makeMutation(task));

      transport.push = async () => {
        throw new Error('500 Internal Server Error');
      };

      await expect(runtime.syncOnce()).rejects.toThrow('500 Internal Server Error');

      const failedEvents = telemetry.getEvents('sync_cycle_failed');
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0]?.phase).toBe('PUSH');
      expect(failedEvents[0]?.error).toBe('500 Internal Server Error');

      expect(telemetry.getLastMetricValue('sync_cycle_failed')).toBe(1);
    });

    it('tracks in-flight recovery metrics and events', async () => {
      const telemetry = new InMemorySyncTelemetry();
      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime,
        telemetry,
        inFlightTimeoutMs: 30000,
        maxAttempts: 5
      });

      // 1. One timed out mutation that can be retried (attemptCount: 1)
      const timedOutTask = makeTask({ id: 'task-timeout' });
      const timedOutSince = new Date(currentTime.getTime() - 40000).toISOString();
      const mut1 = makeMutation(timedOutTask, {
        id: 'mut-timeout',
        status: 'IN_FLIGHT',
        inFlightSince: timedOutSince,
        attemptCount: 1
      });
      await store.enqueueMutation(mut1);

      // 2. One timed out mutation reaching maxAttempts (attemptCount: 4)
      const maxAttemptsTask = makeTask({ id: 'task-max' });
      const mut2 = makeMutation(maxAttemptsTask, {
        id: 'mut-max',
        status: 'IN_FLIGHT',
        inFlightSince: timedOutSince,
        attemptCount: 4
      });
      await store.enqueueMutation(mut2);

      const recovery = await runtime.recoverInFlightMutations();
      expect(recovery.recoveredCount).toBe(1);
      expect(recovery.failedCount).toBe(1);

      const recoveryEvents = telemetry.getEvents('in_flight_recovery');
      expect(recoveryEvents).toHaveLength(1);
      expect(recoveryEvents[0]?.recoveredCount).toBe(1);
      expect(recoveryEvents[0]?.failedCount).toBe(1);

      expect(telemetry.getLastMetricValue('in_flight_timeout_recovery_count')).toBe(1);
      expect(telemetry.getLastMetricValue('failed_mutation_count')).toBe(1);
    });

    it('tracks mutation rejections and retryable errors', async () => {
      const telemetry = new InMemorySyncTelemetry();
      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime,
        telemetry
      });

      const taskRejected = makeTask({ id: 't-rej' });
      const taskRetry = makeTask({ id: 't-ret' });
      await store.enqueueMutation(makeMutation(taskRejected, { id: 'm-rej' }));
      await store.enqueueMutation(makeMutation(taskRetry, { id: 'm-ret' }));

      transport.forcedPushStatuses.set('m-rej', 'REJECTED');
      transport.forcedPushErrors.set('m-rej', 'Payload schema invalid');
      transport.forcedPushStatuses.set('m-ret', 'RETRYABLE_ERROR');
      transport.forcedPushErrors.set('m-ret', 'Rate limited');

      const pushRes = await runtime.pushOnce();
      expect(pushRes.rejectedCount).toBe(1);
      expect(pushRes.retryableCount).toBe(1);
      expect(pushRes.failedCount).toBe(1);

      expect(telemetry.getLastMetricValue('rejected_mutation_count')).toBe(1);
      expect(telemetry.getLastMetricValue('retry_count')).toBe(1);
      expect(telemetry.getLastMetricValue('failed_mutation_count')).toBe(1);

      const pushEvents = telemetry.getEvents('push_batch');
      expect(pushEvents).toHaveLength(1);
      expect(pushEvents[0]?.rejectedCount).toBe(1);
      expect(pushEvents[0]?.retryCount).toBe(1);
      expect(pushEvents[0]?.failedCount).toBe(1);
    });
  });

  // =========================================================================
  // 4. Privacy & Data Minimization Guarantee
  // =========================================================================
  describe('Privacy & Data Minimization (Requirement 3 & 4)', () => {
    it('never leaks task titles, content, descriptions, or private user data into telemetry', async () => {
      const telemetry = new InMemorySyncTelemetry();
      const runtime = new SyncRuntime(store, transport, {
        now: () => currentTime,
        telemetry,
        userScope: 'user-hashed-scope-xyz'
      });

      const privateTitle = 'SECRET_PROJECT_TAKEOVER_PLANS';
      const privateTask = makeTask({
        id: 'secret-task-999',
        title: privateTitle,
        items: [{ id: 'sub-1', title: 'SECRET_SUBTASK_CONTENT', isCompleted: false, order: 0 }]
      });

      transport.addServerTask(privateTask);
      await store.enqueueMutation(makeMutation(privateTask, { id: 'mut-secret' }));

      await runtime.syncOnce({ requestId: 'corr-id-123' });

      // Convert all emitted events and metrics to JSON strings and inspect
      const serializedEvents = JSON.stringify(telemetry.events);
      const serializedMetrics = JSON.stringify(telemetry.metrics);

      expect(serializedEvents).not.toContain(privateTitle);
      expect(serializedEvents).not.toContain('SECRET_SUBTASK_CONTENT');
      expect(serializedMetrics).not.toContain(privateTitle);
      expect(serializedMetrics).not.toContain('SECRET_SUBTASK_CONTENT');

      // Verify only non-sensitive identifiers exist
      expect(serializedEvents).toContain('mut-secret');
      expect(serializedEvents).toContain('user-hashed-scope-xyz');
      expect(serializedEvents).toContain('corr-id-123');
    });
  });
});
