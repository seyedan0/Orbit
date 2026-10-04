import type {
  MutationPayload,
  PullResponse,
  TaskEntity
} from '@orbit/shared-types';
import type {
  LocalStore,
  PushResult,
  SyncTransport
} from './ports.js';
import {
  calculateCursorLag,
  NoopSyncTelemetry,
  type InFlightRecoveryEvent,
  type PullBatchEvent,
  type PushBatchEvent,
  type SyncCycleCompletedEvent,
  type SyncCycleFailedEvent,
  type SyncCycleStartedEvent,
  type SyncTelemetry
} from './telemetry.js';

export interface SyncInvocationContext {
  syncId?: string | undefined;
  requestId?: string | undefined;
  userScope?: string | undefined;
}

export interface SyncRuntimeOptions {
  pushBatchSize?: number | undefined;
  pullBatchSize?: number | undefined;
  retryDelayMs?: number | undefined;
  maxRetryDelayMs?: number | undefined;
  inFlightTimeoutMs?: number | undefined;
  maxAttempts?: number | undefined;
  jitter?: boolean | undefined;
  calculateRetryDelay?: ((attemptCount: number) => number) | undefined;
  now?: (() => Date) | undefined;
  telemetry?: SyncTelemetry | undefined;
  userScope?: string | undefined;
  requestId?: string | undefined;
  generateSyncId?: (() => string) | undefined;
  calculateCursorLag?: ((response: PullResponse, cursorBefore?: string | undefined, nowMs?: number | undefined) => number) | undefined;
}

export interface InFlightRecoveryOptions {
  force?: boolean | undefined;
  timeoutMs?: number | undefined;
}

export interface InFlightRecoveryResult {
  recoveredCount: number;
  failedCount: number;
  unaffectedCount: number;
}

export interface PullRunResult {
  cursorBefore: string | undefined;
  nextCursor: string;
  appliedCount: number;
  hasMore: boolean;
  cursorLag?: number | undefined;
  durationMs?: number | undefined;
}

export interface PushRunResult {
  pushedCount: number;
  succeededCount: number;
  rejectedCount: number;
  retryableCount: number;
  conflictMergedCount: number;
  failedCount: number;
  pendingCount?: number | undefined;
  durationMs?: number | undefined;
  recoveryResult?: InFlightRecoveryResult | undefined;
}

export interface SyncRunResult {
  pull: PullRunResult;
  push: PushRunResult;
}

/**
 * Transport- and storage-agnostic sync runtime.
 * Implements the client sync lifecycle:
 * 1. Pull changes and commit cursor only after successful task persistence.
 * 2. Push pending mutations in FIFO order, marking mutations IN_FLIGHT during push,
 *    updating statuses to SUCCEEDED, PENDING (retryable), or FAILED (permanent).
 * 3. Recover mutations stuck in IN_FLIGHT after timeout or restart.
 * 4. Record health telemetry (events & metrics) without coupling to any vendor.
 */
export class SyncRuntime {
  private readonly now: () => Date;
  private readonly telemetry: SyncTelemetry;

  constructor(
    private readonly store: LocalStore,
    private readonly transport: SyncTransport,
    private readonly options: SyncRuntimeOptions = {}
  ) {
    this.now = options.now ?? (() => new Date());
    this.telemetry = options.telemetry ?? new NoopSyncTelemetry();
  }

  /**
   * Recovers mutations stuck in IN_FLIGHT state.
   * - By default, checks if in-flight duration >= inFlightTimeoutMs (default: 30s).
   * - If options.force is true, recovers all in-flight mutations regardless of elapsed time
   *   (e.g., during process startup or browser reload).
   * - If an entry has reached maxAttempts (default: 5), it transitions to FAILED (permanent).
   * - Otherwise, returns the mutation safely to PENDING with exponential backoff.
   * - Idempotent: repeated runs produce no duplicate actions or entries.
   */
  async recoverInFlightMutations(
    options?: InFlightRecoveryOptions | undefined,
    context?: SyncInvocationContext | undefined
  ): Promise<InFlightRecoveryResult> {
    const startTime = this.now().getTime();
    const inFlight = await this.store.listInFlightMutations();
    if (inFlight.length === 0) {
      return { recoveredCount: 0, failedCount: 0, unaffectedCount: 0 };
    }

    const timeoutMs = options?.timeoutMs ?? this.options.inFlightTimeoutMs ?? 30000;
    const maxAttempts = this.options.maxAttempts ?? 5;
    const nowMs = this.now().getTime();

    let recoveredCount = 0;
    let failedCount = 0;
    let unaffectedCount = 0;

    for (const entry of inFlight) {
      const inFlightSinceMs = entry.inFlightSince
        ? Date.parse(entry.inFlightSince)
        : (entry.nextAttemptAt ? Date.parse(entry.nextAttemptAt) : Date.parse(entry.createdAt));
      const elapsed = nowMs - inFlightSinceMs;
      const isTimedOut = Boolean(options?.force || elapsed >= timeoutMs);

      if (!isTimedOut) {
        unaffectedCount++;
        continue;
      }

      const nextAttemptCount = entry.attemptCount + 1;
      if (nextAttemptCount >= maxAttempts) {
        await this.store.markMutationFailed(
          entry.id,
          `Mutation exceeded maximum retry attempts (${maxAttempts}) after in-flight timeout`,
          '',
          'FAILED'
        );
        failedCount++;
      } else {
        const delay = this.calculateRetryDelay(entry.attemptCount);
        const nextAttemptAt = new Date(nowMs + delay).toISOString();
        await this.store.markMutationFailed(
          entry.id,
          `Recovered timed-out IN_FLIGHT mutation after ${elapsed}ms`,
          nextAttemptAt,
          'PENDING'
        );
        recoveredCount++;
      }
    }

    const durationMs = Math.max(0, this.now().getTime() - startTime);
    const userScope = context?.userScope ?? this.options.userScope;
    const requestId = context?.requestId ?? this.options.requestId;
    const tags: Record<string, string> = {};
    if (userScope) tags.userScope = userScope;
    if (requestId) tags.requestId = requestId;

    if (recoveredCount > 0 || failedCount > 0) {
      this.safeTelemetry((t) => {
        if (recoveredCount > 0) {
          t.recordMetric?.('in_flight_timeout_recovery_count', recoveredCount, tags);
        }
        if (failedCount > 0) {
          t.recordMetric?.('failed_mutation_count', failedCount, tags);
        }
        const event: InFlightRecoveryEvent = {
          type: 'in_flight_recovery',
          syncId: context?.syncId,
          timestamp: this.now().toISOString(),
          recoveredCount,
          failedCount,
          unaffectedCount,
          durationMs,
          userScope,
          requestId
        };
        t.recordEvent?.(event);
        t.onInFlightRecovery?.(event);
      });
    }

    return { recoveredCount, failedCount, unaffectedCount };
  }

  /**
   * Pulls the next batch of changes from the transport starting from the stored cursor.
   * Tasks are persisted locally before advancing the cursor. If saving any task fails,
   * the cursor remains unchanged.
   */
  async pullOnce(context?: SyncInvocationContext | undefined): Promise<PullRunResult> {
    const startTime = this.now().getTime();
    const cursorBefore = await this.store.getCursor();
    const limit = this.options.pullBatchSize ?? 50;

    const response = await this.transport.pull(cursorBefore, limit);

    // Persist all pulled changes before advancing cursor
    for (const task of response.changes) {
      await this.store.saveTask(task);
    }

    // Advance cursor only after all changes have been successfully persisted
    await this.store.saveCursor(response.nextCursor);

    const nowMs = this.now().getTime();
    const durationMs = Math.max(0, nowMs - startTime);
    const cursorLag = this.options.calculateCursorLag
      ? this.options.calculateCursorLag(response, cursorBefore, nowMs)
      : calculateCursorLag(response, cursorBefore, nowMs);

    const userScope = context?.userScope ?? this.options.userScope;
    const requestId = context?.requestId ?? this.options.requestId;
    const tags: Record<string, string> = {};
    if (userScope) tags.userScope = userScope;
    if (requestId) tags.requestId = requestId;

    this.safeTelemetry((t) => {
      t.recordMetric?.('pull_batch_size', response.changes.length, tags);
      t.recordMetric?.('cursor_lag', cursorLag, tags);

      const event: PullBatchEvent = {
        type: 'pull_batch',
        syncId: context?.syncId,
        timestamp: this.now().toISOString(),
        batchSize: response.changes.length,
        appliedCount: response.changes.length,
        hasMore: response.hasMore,
        cursorBefore,
        nextCursor: response.nextCursor,
        cursorLag,
        durationMs,
        userScope,
        requestId
      };
      t.recordEvent?.(event);
      t.onPullBatch?.(event);
    });

    return {
      cursorBefore,
      nextCursor: response.nextCursor,
      appliedCount: response.changes.length,
      hasMore: response.hasMore,
      cursorLag,
      durationMs
    };
  }

  /**
   * Pushes pending mutations to the transport in FIFO order.
   * 1. Recovers any timed-out in-flight mutations.
   * 2. Marks pending mutations as IN_FLIGHT.
   * 3. Updates mutation statuses based on server/transport responses:
   *    - APPLIED, ALREADY_APPLIED, CONFLICT_MERGED -> markMutationSucceeded
   *    - RETRYABLE_ERROR -> markMutationFailed with status 'PENDING' (or 'FAILED' if maxAttempts reached)
   *    - REJECTED -> markMutationFailed with status 'FAILED' (never retried automatically)
   */
  async pushOnce(context?: SyncInvocationContext | undefined): Promise<PushRunResult> {
    const startTime = this.now().getTime();

    // 1. Recover any timed-out in-flight mutations first
    const recoveryResult = await this.recoverInFlightMutations(undefined, context);

    const limit = this.options.pushBatchSize ?? 50;
    const pending = await this.store.listPendingMutations(limit);

    const userScope = context?.userScope ?? this.options.userScope;
    const requestId = context?.requestId ?? this.options.requestId;
    const tags: Record<string, string> = {};
    if (userScope) tags.userScope = userScope;
    if (requestId) tags.requestId = requestId;

    if (pending.length === 0) {
      const durationMs = Math.max(0, this.now().getTime() - startTime);
      this.safeTelemetry((t) => {
        t.recordMetric?.('push_batch_size', 0, tags);
        t.recordMetric?.('pending_mutation_count', 0, tags);
      });
      return {
        pushedCount: 0,
        succeededCount: 0,
        rejectedCount: 0,
        retryableCount: 0,
        conflictMergedCount: 0,
        failedCount: 0,
        pendingCount: 0,
        durationMs,
        recoveryResult
      };
    }

    // 2. Mark pending mutations as IN_FLIGHT before sending to transport
    const inFlightTimestamp = this.now().toISOString();
    for (const entry of pending) {
      await this.store.markMutationInFlight(entry.id, inFlightTimestamp);
    }

    // Extract payloads preserving FIFO ordering (and NEVER passing task titles or private user data)
    const payloads: MutationPayload[] = pending.map((entry) => ({
      id: entry.id,
      idempotencyKey: entry.idempotencyKey,
      entityType: entry.entityType,
      entityId: entry.entityId,
      operation: entry.operation,
      baseVersion: entry.baseVersion,
      payloadType: entry.payloadType,
      payload: entry.payload,
      fieldTimestamps: entry.fieldTimestamps,
      createdAt: entry.createdAt
    }));

    let results: PushResult[];
    const maxAttempts = this.options.maxAttempts ?? 5;

    try {
      results = await this.transport.push(payloads);
    } catch (error) {
      // Whole-batch transport error: schedule retry for all pending mutations or fail if max attempts reached
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isPermanent = Boolean(
        error &&
          typeof error === 'object' &&
          'isRetryable' in error &&
          !(error as { isRetryable: boolean }).isRetryable
      );

      let wholeBatchRetryCount = 0;
      let wholeBatchFailedCount = 0;

      for (const entry of pending) {
        const nextAttemptCount = entry.attemptCount + 1;
        if (isPermanent || nextAttemptCount >= maxAttempts) {
          await this.store.markMutationFailed(
            entry.id,
            isPermanent ? errorMessage : `${errorMessage} (Max attempts reached)`,
            '',
            'FAILED'
          );
          wholeBatchFailedCount++;
        } else {
          const delay = this.calculateRetryDelay(entry.attemptCount);
          const nextAttemptAt = new Date(this.now().getTime() + delay).toISOString();
          await this.store.markMutationFailed(
            entry.id,
            errorMessage,
            nextAttemptAt,
            'PENDING'
          );
          wholeBatchRetryCount++;
        }
      }

      const durationMs = Math.max(0, this.now().getTime() - startTime);

      this.safeTelemetry((t) => {
        t.recordMetric?.('push_batch_size', pending.length, tags);
        t.recordMetric?.('pending_mutation_count', pending.length, tags);
        if (wholeBatchRetryCount > 0) {
          t.recordMetric?.('retry_count', wholeBatchRetryCount, tags);
        }
        if (wholeBatchFailedCount > 0) {
          t.recordMetric?.('failed_mutation_count', wholeBatchFailedCount, tags);
        }

        const event: PushBatchEvent = {
          type: 'push_batch',
          syncId: context?.syncId,
          timestamp: this.now().toISOString(),
          batchSize: pending.length,
          succeededCount: 0,
          rejectedCount: 0,
          retryCount: wholeBatchRetryCount,
          failedCount: wholeBatchFailedCount,
          conflictMergedCount: 0,
          durationMs,
          mutationIds: pending.map((m) => m.id),
          userScope,
          requestId
        };
        t.recordEvent?.(event);
        t.onPushBatch?.(event);
      });

      throw error;
    }

    let succeededCount = 0;
    let rejectedCount = 0;
    let retryableCount = 0;
    let conflictMergedCount = 0;
    let failedCount = 0;

    for (const result of results) {
      const entry = pending.find((m) => m.id === result.mutationId);
      if (!entry) continue;

      if (
        result.status === 'APPLIED' ||
        result.status === 'ALREADY_APPLIED' ||
        result.status === 'CONFLICT_MERGED'
      ) {
        await this.store.markMutationSucceeded(result.mutationId);
        if (result.task) {
          await this.store.saveTask(result.task);
        }
        succeededCount++;
        if (result.status === 'CONFLICT_MERGED') {
          conflictMergedCount++;
        }
      } else if (result.status === 'RETRYABLE_ERROR') {
        const nextAttemptCount = entry.attemptCount + 1;
        if (nextAttemptCount >= maxAttempts) {
          await this.store.markMutationFailed(
            result.mutationId,
            result.error ?? 'Retry limit reached',
            '',
            'FAILED'
          );
          rejectedCount++;
          failedCount++;
        } else {
          const delay = this.calculateRetryDelay(entry.attemptCount);
          const nextAttemptAt = new Date(this.now().getTime() + delay).toISOString();
          await this.store.markMutationFailed(
            result.mutationId,
            result.error ?? 'Retryable error',
            nextAttemptAt,
            'PENDING'
          );
          retryableCount++;
        }
      } else if (result.status === 'REJECTED') {
        // Mark as FAILED; excluded from pending list so it won't be retried automatically
        await this.store.markMutationFailed(
          result.mutationId,
          result.error ?? 'Rejected',
          '',
          'FAILED'
        );
        rejectedCount++;
        failedCount++;
      }
    }

    const durationMs = Math.max(0, this.now().getTime() - startTime);

    this.safeTelemetry((t) => {
      t.recordMetric?.('push_batch_size', pending.length, tags);
      t.recordMetric?.('pending_mutation_count', pending.length, tags);
      if (retryableCount > 0) {
        t.recordMetric?.('retry_count', retryableCount, tags);
      }
      if (rejectedCount > 0) {
        t.recordMetric?.('rejected_mutation_count', rejectedCount, tags);
      }
      if (conflictMergedCount > 0) {
        t.recordMetric?.('conflict_merged_count', conflictMergedCount, tags);
      }
      if (failedCount > 0) {
        t.recordMetric?.('failed_mutation_count', failedCount, tags);
      }

      const event: PushBatchEvent = {
        type: 'push_batch',
        syncId: context?.syncId,
        timestamp: this.now().toISOString(),
        batchSize: pending.length,
        succeededCount,
        rejectedCount,
        retryCount: retryableCount,
        failedCount,
        conflictMergedCount,
        durationMs,
        mutationIds: pending.map((m) => m.id),
        userScope,
        requestId
      };
      t.recordEvent?.(event);
      t.onPushBatch?.(event);
    });

    return {
      pushedCount: pending.length,
      succeededCount,
      rejectedCount,
      retryableCount,
      conflictMergedCount,
      failedCount,
      pendingCount: pending.length,
      durationMs,
      recoveryResult
    };
  }

  /**
   * Performs a single synchronization cycle: pull incoming changes, then push pending local mutations.
   */
  async syncOnce(context?: SyncInvocationContext | undefined): Promise<SyncRunResult> {
    const syncId = context?.syncId ?? this.generateSyncId();
    const invocationContext: SyncInvocationContext = {
      ...context,
      syncId
    };

    const startTime = this.now().getTime();
    const userScope = invocationContext.userScope ?? this.options.userScope;
    const requestId = invocationContext.requestId ?? this.options.requestId;
    const tags: Record<string, string> = {};
    if (userScope) tags.userScope = userScope;
    if (requestId) tags.requestId = requestId;

    this.safeTelemetry((t) => {
      t.recordMetric?.('sync_cycle_started', 1, tags);
      const startEvent: SyncCycleStartedEvent = {
        type: 'sync_cycle_started',
        syncId,
        timestamp: new Date(startTime).toISOString(),
        userScope,
        requestId
      };
      t.recordEvent?.(startEvent);
      t.onSyncCycleStarted?.(startEvent);
    });

    let pull: PullRunResult;
    try {
      pull = await this.pullOnce(invocationContext);
    } catch (error) {
      const durationMs = Math.max(0, this.now().getTime() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.safeTelemetry((t) => {
        t.recordMetric?.('sync_cycle_failed', 1, { ...tags, phase: 'PULL' });
        t.recordMetric?.('sync_duration_ms', durationMs, { ...tags, phase: 'PULL' });
        const failEvent: SyncCycleFailedEvent = {
          type: 'sync_cycle_failed',
          syncId,
          timestamp: this.now().toISOString(),
          durationMs,
          phase: 'PULL',
          error: errorMessage,
          userScope,
          requestId
        };
        t.recordEvent?.(failEvent);
        t.onSyncCycleFailed?.(failEvent);
      });
      throw error;
    }

    let push: PushRunResult;
    try {
      push = await this.pushOnce(invocationContext);
    } catch (error) {
      const durationMs = Math.max(0, this.now().getTime() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.safeTelemetry((t) => {
        t.recordMetric?.('sync_cycle_failed', 1, { ...tags, phase: 'PUSH' });
        t.recordMetric?.('sync_duration_ms', durationMs, { ...tags, phase: 'PUSH' });
        const failEvent: SyncCycleFailedEvent = {
          type: 'sync_cycle_failed',
          syncId,
          timestamp: this.now().toISOString(),
          durationMs,
          phase: 'PUSH',
          error: errorMessage,
          userScope,
          requestId
        };
        t.recordEvent?.(failEvent);
        t.onSyncCycleFailed?.(failEvent);
      });
      throw error;
    }

    const durationMs = Math.max(0, this.now().getTime() - startTime);

    this.safeTelemetry((t) => {
      t.recordMetric?.('sync_cycle_completed', 1, tags);
      t.recordMetric?.('sync_duration_ms', durationMs, tags);

      const completeEvent: SyncCycleCompletedEvent = {
        type: 'sync_cycle_completed',
        syncId,
        timestamp: this.now().toISOString(),
        durationMs,
        pushBatchSize: push.pushedCount,
        pullBatchSize: pull.appliedCount,
        pendingMutationCount: push.pendingCount ?? push.pushedCount,
        retryCount: push.retryableCount,
        inFlightRecoveryCount: push.recoveryResult?.recoveredCount ?? 0,
        failedMutationCount: (push.recoveryResult?.failedCount ?? 0) + push.failedCount,
        rejectedMutationCount: push.rejectedCount,
        conflictMergedCount: push.conflictMergedCount,
        cursorLag: pull.cursorLag ?? 0,
        userScope,
        requestId
      };
      t.recordEvent?.(completeEvent);
      t.onSyncCycleCompleted?.(completeEvent);
    });

    return { pull, push };
  }

  private safeTelemetry(fn: (telemetry: SyncTelemetry) => void): void {
    try {
      fn(this.telemetry);
    } catch {
      // Telemetry must NEVER throw or disrupt sync execution
    }
  }

  private generateSyncId(): string {
    if (this.options.generateSyncId) {
      try {
        return this.options.generateSyncId();
      } catch {
        // Fallback if custom generator throws
      }
    }
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private calculateRetryDelay(attemptCount: number): number {
    if (this.options.calculateRetryDelay) {
      return this.options.calculateRetryDelay(attemptCount);
    }
    const baseDelay = this.options.retryDelayMs ?? 1000;
    const maxDelay = this.options.maxRetryDelayMs ?? 60000;
    const expDelay = baseDelay * Math.pow(2, attemptCount);
    const delay = Math.min(expDelay, maxDelay);
    if (this.options.jitter) {
      return Math.floor(Math.random() * delay);
    }
    return delay;
  }
}
