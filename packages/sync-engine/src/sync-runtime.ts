import type {
  MutationPayload,
  TaskEntity
} from '@orbit/shared-types';
import type {
  LocalStore,
  PushResult,
  SyncTransport
} from './ports.js';

export interface SyncRuntimeOptions {
  pushBatchSize?: number;
  pullBatchSize?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  inFlightTimeoutMs?: number;
  maxAttempts?: number;
  jitter?: boolean;
  calculateRetryDelay?: (attemptCount: number) => number;
  now?: () => Date;
}

export interface InFlightRecoveryOptions {
  force?: boolean;
  timeoutMs?: number;
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
}

export interface PushRunResult {
  pushedCount: number;
  succeededCount: number;
  rejectedCount: number;
  retryableCount: number;
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
 */
export class SyncRuntime {
  private readonly now: () => Date;

  constructor(
    private readonly store: LocalStore,
    private readonly transport: SyncTransport,
    private readonly options: SyncRuntimeOptions = {}
  ) {
    this.now = options.now ?? (() => new Date());
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
    options?: InFlightRecoveryOptions
  ): Promise<InFlightRecoveryResult> {
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

    return { recoveredCount, failedCount, unaffectedCount };
  }

  /**
   * Pulls the next batch of changes from the transport starting from the stored cursor.
   * Tasks are persisted locally before advancing the cursor. If saving any task fails,
   * the cursor remains unchanged.
   */
  async pullOnce(): Promise<PullRunResult> {
    const cursorBefore = await this.store.getCursor();
    const limit = this.options.pullBatchSize ?? 50;

    const response = await this.transport.pull(cursorBefore, limit);

    // Persist all pulled changes before advancing cursor
    for (const task of response.changes) {
      await this.store.saveTask(task);
    }

    // Advance cursor only after all changes have been successfully persisted
    await this.store.saveCursor(response.nextCursor);

    return {
      cursorBefore,
      nextCursor: response.nextCursor,
      appliedCount: response.changes.length,
      hasMore: response.hasMore
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
  async pushOnce(): Promise<PushRunResult> {
    // 1. Recover any timed-out in-flight mutations first
    await this.recoverInFlightMutations();

    const limit = this.options.pushBatchSize ?? 50;
    const pending = await this.store.listPendingMutations(limit);

    if (pending.length === 0) {
      return {
        pushedCount: 0,
        succeededCount: 0,
        rejectedCount: 0,
        retryableCount: 0
      };
    }

    // 2. Mark pending mutations as IN_FLIGHT before sending to transport
    const inFlightTimestamp = this.now().toISOString();
    for (const entry of pending) {
      await this.store.markMutationInFlight(entry.id, inFlightTimestamp);
    }

    // Extract payloads preserving FIFO ordering
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

      for (const entry of pending) {
        const nextAttemptCount = entry.attemptCount + 1;
        if (isPermanent || nextAttemptCount >= maxAttempts) {
          await this.store.markMutationFailed(
            entry.id,
            isPermanent ? errorMessage : `${errorMessage} (Max attempts reached)`,
            '',
            'FAILED'
          );
        } else {
          const delay = this.calculateRetryDelay(entry.attemptCount);
          const nextAttemptAt = new Date(this.now().getTime() + delay).toISOString();
          await this.store.markMutationFailed(
            entry.id,
            errorMessage,
            nextAttemptAt,
            'PENDING'
          );
        }
      }
      throw error;
    }

    let succeededCount = 0;
    let rejectedCount = 0;
    let retryableCount = 0;

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
      }
    }

    return {
      pushedCount: pending.length,
      succeededCount,
      rejectedCount,
      retryableCount
    };
  }

  /**
   * Performs a single synchronization cycle: pull incoming changes, then push pending local mutations.
   */
  async syncOnce(): Promise<SyncRunResult> {
    const pull = await this.pullOnce();
    const push = await this.pushOnce();
    return { pull, push };
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
