import type { PullResponse } from '@orbit/shared-types';

export type SyncMetricType = 'counter' | 'gauge' | 'histogram';

export type SyncMetricName =
  | 'sync_cycle_started'
  | 'sync_cycle_completed'
  | 'sync_cycle_failed'
  | 'push_batch_size'
  | 'pull_batch_size'
  | 'pending_mutation_count'
  | 'retry_count'
  | 'in_flight_timeout_recovery_count'
  | 'failed_mutation_count'
  | 'rejected_mutation_count'
  | 'conflict_merged_count'
  | 'cursor_lag'
  | 'sync_duration_ms'
  | (string & {});

export interface SyncMetricRecord {
  name: SyncMetricName;
  value: number;
  type?: SyncMetricType | undefined;
  tags?: Record<string, string> | undefined;
  timestamp: string;
}

export type SyncTelemetryEventType =
  | 'sync_cycle_started'
  | 'sync_cycle_completed'
  | 'sync_cycle_failed'
  | 'push_batch'
  | 'pull_batch'
  | 'in_flight_recovery';

export interface BaseSyncTelemetryEvent {
  type: SyncTelemetryEventType;
  timestamp: string;
  syncId?: string | undefined;
  requestId?: string | undefined;
  userScope?: string | undefined;
}

export interface SyncCycleStartedEvent extends BaseSyncTelemetryEvent {
  type: 'sync_cycle_started';
  syncId: string;
}

export interface SyncCycleCompletedEvent extends BaseSyncTelemetryEvent {
  type: 'sync_cycle_completed';
  syncId: string;
  durationMs: number;
  pushBatchSize: number;
  pullBatchSize: number;
  pendingMutationCount: number;
  retryCount: number;
  inFlightRecoveryCount: number;
  failedMutationCount: number;
  rejectedMutationCount: number;
  conflictMergedCount: number;
  cursorLag: number;
}

export interface SyncCycleFailedEvent extends BaseSyncTelemetryEvent {
  type: 'sync_cycle_failed';
  syncId: string;
  durationMs: number;
  phase: 'PULL' | 'PUSH' | 'RECOVERY' | 'SYNC';
  error: string;
}

export interface PushBatchEvent extends BaseSyncTelemetryEvent {
  type: 'push_batch';
  batchSize: number;
  succeededCount: number;
  rejectedCount: number;
  retryCount: number;
  failedCount: number;
  conflictMergedCount: number;
  durationMs: number;
  mutationIds?: string[] | undefined;
}

export interface PullBatchEvent extends BaseSyncTelemetryEvent {
  type: 'pull_batch';
  batchSize: number;
  appliedCount: number;
  hasMore: boolean;
  cursorBefore?: string | undefined;
  nextCursor: string;
  cursorLag: number;
  durationMs: number;
}

export interface InFlightRecoveryEvent extends BaseSyncTelemetryEvent {
  type: 'in_flight_recovery';
  recoveredCount: number;
  failedCount: number;
  unaffectedCount: number;
  durationMs: number;
}

export type SyncTelemetryEvent =
  | SyncCycleStartedEvent
  | SyncCycleCompletedEvent
  | SyncCycleFailedEvent
  | PushBatchEvent
  | PullBatchEvent
  | InFlightRecoveryEvent;

/**
 * Small, vendor-neutral telemetry interface for synchronization health,
 * operational metrics, and event diagnostics.
 *
 * PRIVACY GUARANTEE: Implementations and callers MUST NEVER pass task titles,
 * descriptions, task contents, or private user data into telemetry methods.
 * Only non-sensitive operational identifiers (requestId, mutationId, userScope)
 * and numerical metrics are permitted.
 */
export interface SyncTelemetry {
  /** Record a single numeric metric */
  recordMetric?(name: SyncMetricName, value: number, tags?: Record<string, string> | undefined): void;
  /** Record a structured sync event */
  recordEvent?(event: SyncTelemetryEvent): void;
  /** Callback when a sync cycle starts */
  onSyncCycleStarted?(event: SyncCycleStartedEvent): void;
  /** Callback when a sync cycle completes successfully */
  onSyncCycleCompleted?(event: SyncCycleCompletedEvent): void;
  /** Callback when a sync cycle fails */
  onSyncCycleFailed?(event: SyncCycleFailedEvent): void;
  /** Callback after push batch */
  onPushBatch?(event: PushBatchEvent): void;
  /** Callback after pull batch */
  onPullBatch?(event: PullBatchEvent): void;
  /** Callback after in-flight recovery */
  onInFlightRecovery?(event: InFlightRecoveryEvent): void;
}

/**
 * Default no-op telemetry implementation with zero overhead and zero I/O.
 */
export class NoopSyncTelemetry implements SyncTelemetry {
  recordMetric(): void {}
  recordEvent(): void {}
  onSyncCycleStarted(): void {}
  onSyncCycleCompleted(): void {}
  onSyncCycleFailed(): void {}
  onPushBatch(): void {}
  onPullBatch(): void {}
  onInFlightRecovery(): void {}
}

/**
 * Map of event type to specific event interface.
 */
export interface SyncTelemetryEventMap {
  sync_cycle_started: SyncCycleStartedEvent;
  sync_cycle_completed: SyncCycleCompletedEvent;
  sync_cycle_failed: SyncCycleFailedEvent;
  push_batch: PushBatchEvent;
  pull_batch: PullBatchEvent;
  in_flight_recovery: InFlightRecoveryEvent;
}

/**
 * In-memory telemetry collector for automated tests, diagnostics, and debugging.
 */
export class InMemorySyncTelemetry implements SyncTelemetry {
  readonly events: SyncTelemetryEvent[] = [];
  readonly metrics: SyncMetricRecord[] = [];

  recordMetric(name: SyncMetricName, value: number, tags?: Record<string, string> | undefined): void {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date().toISOString()
    });
  }

  recordEvent(event: SyncTelemetryEvent): void {
    this.events.push(event);
  }

  onSyncCycleStarted(_event: SyncCycleStartedEvent): void {}

  onSyncCycleCompleted(_event: SyncCycleCompletedEvent): void {}

  onSyncCycleFailed(_event: SyncCycleFailedEvent): void {}

  onPushBatch(_event: PushBatchEvent): void {}

  onPullBatch(_event: PullBatchEvent): void {}

  onInFlightRecovery(_event: InFlightRecoveryEvent): void {}

  getEvents<K extends SyncTelemetryEventType>(type: K): SyncTelemetryEventMap[K][];
  getEvents(): SyncTelemetryEvent[];
  getEvents(type?: SyncTelemetryEventType): SyncTelemetryEvent[] {
    if (!type) return this.events;
    return this.events.filter((e) => e.type === type);
  }

  getMetrics(name?: SyncMetricName): SyncMetricRecord[] {
    if (!name) return [...this.metrics];
    return this.metrics.filter((m) => m.name === name);
  }

  getMetricValues(name: SyncMetricName): number[] {
    return this.getMetrics(name).map((m) => m.value);
  }

  getLastMetric(name: SyncMetricName): SyncMetricRecord | undefined {
    const matches = this.getMetrics(name);
    return matches.length > 0 ? matches[matches.length - 1] : undefined;
  }

  getLastMetricValue(name: SyncMetricName): number | undefined {
    return this.getLastMetric(name)?.value;
  }

  getSumMetric(name: SyncMetricName): number {
    return this.getMetricValues(name).reduce((sum, v) => sum + v, 0);
  }

  clear(): void {
    this.events.length = 0;
    this.metrics.length = 0;
  }
}

/**
 * Calculates cursor lag in seconds or sequence count.
 * Priority:
 * 1. Time-based lag: age in seconds of the latest task in changes relative to now.
 * 2. Sequence-based lag: numerical difference between nextCursor and cursorBefore.
 * 3. Flag-based lag: 1 if hasMore is true, else 0.
 */
export function calculateCursorLag(
  response: PullResponse,
  cursorBefore?: string | undefined,
  nowMs: number = Date.now()
): number {
  if (response.changes.length > 0) {
    let latestTime = 0;
    for (const change of response.changes) {
      const timeStr = change.updatedAt || change.createdAt;
      if (timeStr) {
        const parsed = Date.parse(timeStr);
        if (!Number.isNaN(parsed) && parsed > latestTime) {
          latestTime = parsed;
        }
      }
    }
    if (latestTime > 0) {
      return Math.max(0, Math.floor((nowMs - latestTime) / 1000));
    }
  }

  if (response.nextCursor) {
    const nextNum = parseInt(response.nextCursor, 10);
    const prevNum = cursorBefore ? parseInt(cursorBefore, 10) : 0;
    if (!Number.isNaN(nextNum) && !Number.isNaN(prevNum) && nextNum >= prevNum) {
      return nextNum - prevNum;
    }
  }

  return response.hasMore ? 1 : 0;
}
