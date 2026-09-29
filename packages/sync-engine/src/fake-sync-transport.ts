import type {
  MutationPayload,
  PullResponse,
  TaskEntity
} from '@orbit/shared-types';
import type {
  PushResult,
  PushResultStatus,
  SyncTransport
} from './ports.js';

export interface FakeSyncTransportOptions {
  initialTasks?: TaskEntity[];
}

/**
 * Deterministic in-memory fake SyncTransport for testing sync runtime behaviors.
 */
export class FakeSyncTransport implements SyncTransport {
  private readonly tasks = new Map<string, TaskEntity>();
  private readonly changeLog: Array<{ cursor: string; task: TaskEntity }> = [];
  private readonly appliedIdempotencyKeys = new Set<string>();
  private cursorSequence = 0;

  public readonly pushedBatches: MutationPayload[][] = [];
  public readonly pullRequests: Array<{ cursor: string | undefined; limit: number }> = [];

  public simulateNetworkErrorOnPush = false;
  public simulateNetworkErrorOnPull = false;
  public readonly forcedPushStatuses = new Map<string, PushResultStatus>();
  public readonly forcedPushErrors = new Map<string, string>();

  constructor(options?: FakeSyncTransportOptions) {
    if (options?.initialTasks) {
      for (const task of options.initialTasks) {
        this.addServerTask(task);
      }
    }
  }

  addServerTask(task: TaskEntity): string {
    const cloned = structuredClone(task);
    this.tasks.set(cloned.id, cloned);
    this.cursorSequence++;
    const cursor = `c_${this.cursorSequence}`;
    this.changeLog.push({ cursor, task: cloned });
    return cursor;
  }

  getServerTask(id: string): TaskEntity | undefined {
    const task = this.tasks.get(id);
    return task ? structuredClone(task) : undefined;
  }

  getAllServerTasks(): TaskEntity[] {
    return [...this.tasks.values()].map((t) => structuredClone(t));
  }

  async pull(cursor: string | undefined, limit: number): Promise<PullResponse> {
    this.pullRequests.push({ cursor, limit });

    if (this.simulateNetworkErrorOnPull) {
      throw new Error('Simulated network error on pull');
    }

    let startIndex = 0;
    if (cursor) {
      const idx = this.changeLog.findIndex((entry) => entry.cursor === cursor);
      if (idx !== -1) {
        startIndex = idx + 1;
      }
    }

    const slice = this.changeLog.slice(startIndex, startIndex + Math.max(0, limit));
    const hasMore = startIndex + slice.length < this.changeLog.length;
    const nextCursor = slice.length > 0 ? slice[slice.length - 1]!.cursor : (cursor ?? 'c_0');

    return {
      changes: slice.map((entry) => structuredClone(entry.task)),
      nextCursor,
      hasMore
    };
  }

  async push(mutations: MutationPayload[]): Promise<PushResult[]> {
    this.pushedBatches.push(structuredClone(mutations));

    if (this.simulateNetworkErrorOnPush) {
      throw new Error('Simulated network error on push');
    }

    const results: PushResult[] = [];

    for (const mutation of mutations) {
      const forcedStatus = this.forcedPushStatuses.get(mutation.id);
      if (forcedStatus) {
        const error = this.forcedPushErrors.get(mutation.id);
        results.push({
          mutationId: mutation.id,
          status: forcedStatus,
          ...(error !== undefined ? { error } : {})
        });
        continue;
      }

      if (this.appliedIdempotencyKeys.has(mutation.idempotencyKey)) {
        const task = this.getServerTask(mutation.entityId);
        results.push({
          mutationId: mutation.id,
          status: 'ALREADY_APPLIED',
          ...(task ? { task } : {})
        });
        continue;
      }

      this.appliedIdempotencyKeys.add(mutation.idempotencyKey);

      let updatedTask: TaskEntity;
      const existing = this.tasks.get(mutation.entityId);

      if (mutation.operation === 'CREATE') {
        updatedTask = {
          ...(mutation.payload as TaskEntity),
          id: mutation.entityId,
          version: 1,
          localStatus: 'SYNCED'
        };
      } else if (mutation.operation === 'UPDATE') {
        if (existing) {
          updatedTask = {
            ...existing,
            ...mutation.payload,
            version: existing.version + 1,
            localStatus: 'SYNCED'
          };
        } else {
          updatedTask = {
            ...(mutation.payload as TaskEntity),
            id: mutation.entityId,
            version: mutation.baseVersion + 1,
            localStatus: 'SYNCED'
          };
        }
      } else {
        // DELETE
        if (existing) {
          updatedTask = {
            ...existing,
            deletedAt: new Date().toISOString(),
            version: existing.version + 1,
            localStatus: 'SYNCED'
          };
        } else {
          updatedTask = {
            ...(mutation.payload as TaskEntity),
            id: mutation.entityId,
            deletedAt: new Date().toISOString(),
            version: mutation.baseVersion + 1,
            localStatus: 'SYNCED'
          };
        }
      }

      this.tasks.set(updatedTask.id, updatedTask);
      this.cursorSequence++;
      this.changeLog.push({ cursor: `c_${this.cursorSequence}`, task: updatedTask });

      results.push({
        mutationId: mutation.id,
        status: 'APPLIED',
        task: updatedTask
      });
    }

    return results;
  }
}
