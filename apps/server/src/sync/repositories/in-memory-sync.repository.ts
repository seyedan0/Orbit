import { Injectable } from '@nestjs/common';
import type { MutationPayload, TaskEntity } from '@orbit/shared-types';
import type {
  ApplyMutationResult,
  CleanTombstonesOptions,
  CleanTombstonesResult,
  PullResult,
  SyncRepository
} from '../interfaces/sync-repository.interface.js';

interface ChangelogEntry {
  cursor: number;
  task: TaskEntity;
}

@Injectable()
export class InMemorySyncRepository implements SyncRepository {
  private tasks = new Map<string, Map<string, TaskEntity>>();
  private mutations = new Map<string, Map<string, MutationPayload>>();
  private cleanedTombstones = new Map<string, Map<string, { deletedAt: string; purgedAt: Date }>>();
  private changelog = new Map<string, ChangelogEntry[]>();
  private counters = new Map<string, number>();

  private getUserCleanedTombstones(
    userId: string
  ): Map<string, { deletedAt: string; purgedAt: Date }> {
    let userCleaned = this.cleanedTombstones.get(userId);
    if (!userCleaned) {
      userCleaned = new Map();
      this.cleanedTombstones.set(userId, userCleaned);
    }
    return userCleaned;
  }

  private getUserTasks(userId: string): Map<string, TaskEntity> {
    let userTasks = this.tasks.get(userId);
    if (!userTasks) {
      userTasks = new Map<string, TaskEntity>();
      this.tasks.set(userId, userTasks);
    }
    return userTasks;
  }

  private getUserMutations(userId: string): Map<string, MutationPayload> {
    let userMutations = this.mutations.get(userId);
    if (!userMutations) {
      userMutations = new Map<string, MutationPayload>();
      this.mutations.set(userId, userMutations);
    }
    return userMutations;
  }

  private getUserChangelog(userId: string): ChangelogEntry[] {
    let log = this.changelog.get(userId);
    if (!log) {
      log = [];
      this.changelog.set(userId, log);
    }
    return log;
  }

  async getMutationByIdempotencyKey(
    userId: string,
    idempotencyKey: string
  ): Promise<MutationPayload | null> {
    const userMutations = this.getUserMutations(userId);
    return userMutations.get(idempotencyKey) ?? null;
  }

  async saveAppliedMutation(userId: string, mutation: MutationPayload): Promise<void> {
    const userMutations = this.getUserMutations(userId);
    userMutations.set(mutation.idempotencyKey, { ...mutation });
  }

  async applyMutationAtomic(
    userId: string,
    mutation: MutationPayload
  ): Promise<ApplyMutationResult> {
    const existing = await this.getMutationByIdempotencyKey(userId, mutation.idempotencyKey);
    if (existing) {
      return { status: 'ALREADY_APPLIED' };
    }

    const userCleaned = this.getUserCleanedTombstones(userId);
    if (userCleaned.has(mutation.entityId)) {
      return {
        status: 'REJECTED',
        error: `Task ${mutation.entityId} was permanently cleaned up and cannot be resurrected`
      };
    }

    const task = await this.applyTaskMutation(userId, mutation);
    await this.saveAppliedMutation(userId, mutation);
    return { status: 'APPLIED', task };
  }

  async applyTaskMutation(userId: string, mutation: MutationPayload): Promise<TaskEntity> {
    const userCleaned = this.getUserCleanedTombstones(userId);
    if (userCleaned.has(mutation.entityId)) {
      throw new Error(
        `Task ${mutation.entityId} was permanently cleaned up and cannot be resurrected`
      );
    }

    const userTasks = this.getUserTasks(userId);
    const existing = userTasks.get(mutation.entityId);
    const version = existing ? existing.version + 1 : (mutation.baseVersion || 0) + 1;

    let updated: TaskEntity;

    if (mutation.operation === 'CREATE') {
      updated = {
        id: mutation.entityId,
        projectId: mutation.payload.projectId ?? 'inbox',
        userId,
        title: mutation.payload.title ?? '',
        kind: mutation.payload.kind ?? 'TASK',
        priority: mutation.payload.priority ?? 0,
        isAllDay: mutation.payload.isAllDay ?? false,
        timeZone: mutation.payload.timeZone ?? 'UTC',
        reminders: mutation.payload.reminders ?? [],
        items: mutation.payload.items ?? [],
        version,
        localStatus: 'CREATED',
        createdAt: mutation.payload.createdAt ?? mutation.createdAt,
        updatedAt: mutation.payload.updatedAt ?? mutation.createdAt,
        completedAt: mutation.payload.completedAt ?? null,
        ...(mutation.payload.deletedAt ? { deletedAt: mutation.payload.deletedAt } : {})
      };
    } else if (mutation.operation === 'UPDATE') {
      const baseTask: TaskEntity = existing ?? {
        id: mutation.entityId,
        projectId: 'inbox',
        userId,
        title: '',
        kind: 'TASK',
        priority: 0,
        isAllDay: false,
        timeZone: 'UTC',
        reminders: [],
        items: [],
        version: 0,
        localStatus: 'CREATED',
        createdAt: mutation.createdAt,
        updatedAt: mutation.createdAt,
        completedAt: null
      };

      updated = {
        ...baseTask,
        ...mutation.payload,
        id: baseTask.id,
        userId,
        version,
        updatedAt: mutation.payload.updatedAt ?? mutation.createdAt
      };
    } else {
      // DELETE
      const baseTask: TaskEntity = existing ?? {
        id: mutation.entityId,
        projectId: 'inbox',
        userId,
        title: '',
        kind: 'TASK',
        priority: 0,
        isAllDay: false,
        timeZone: 'UTC',
        reminders: [],
        items: [],
        version: 0,
        localStatus: 'CREATED',
        createdAt: mutation.createdAt,
        updatedAt: mutation.createdAt,
        completedAt: null
      };

      updated = {
        ...baseTask,
        version,
        deletedAt: mutation.payload.deletedAt ?? mutation.createdAt,
        updatedAt: mutation.payload.updatedAt ?? mutation.createdAt
      };
    }

    userTasks.set(updated.id, updated);

    // Append to changelog
    const nextCounter = (this.counters.get(userId) ?? 0) + 1;
    this.counters.set(userId, nextCounter);

    const log = this.getUserChangelog(userId);
    log.push({ cursor: nextCounter, task: { ...updated } });

    return updated;
  }

  async getChanges(
    userId: string,
    cursor: string | undefined,
    limit: number
  ): Promise<PullResult> {
    const parsedCursor = cursor ? parseInt(cursor, 10) : 0;
    const currentCursor = Number.isNaN(parsedCursor) ? 0 : parsedCursor;

    const log = this.getUserChangelog(userId);
    const candidateChanges = log.filter((entry) => entry.cursor > currentCursor);

    const safeLimit = Math.max(1, Math.min(limit, 100));
    const sliced = candidateChanges.slice(0, safeLimit);
    const hasMore = candidateChanges.length > safeLimit;
    const nextCursor =
      sliced.length > 0
        ? String(sliced[sliced.length - 1]!.cursor)
        : String(currentCursor);

    return {
      changes: sliced.map((entry) => entry.task),
      nextCursor,
      hasMore
    };
  }

  async cleanTombstones(options?: CleanTombstonesOptions): Promise<CleanTombstonesResult> {
    const retentionDays = options?.retentionDays ?? 30;
    const now = options?.now ?? new Date();
    const cutoffTime =
      options?.cutoffDate?.getTime() ??
      now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
    const cutoffIso = new Date(cutoffTime).toISOString();

    const userIds = options?.userId ? [options.userId] : Array.from(this.tasks.keys());
    let cleanedCount = 0;
    const cleanedTaskIds: string[] = [];

    for (const uid of userIds) {
      const userTasks = this.getUserTasks(uid);
      const userCleaned = this.getUserCleanedTombstones(uid);

      for (const [id, task] of Array.from(userTasks.entries())) {
        if (task.deletedAt && task.deletedAt <= cutoffIso) {
          userTasks.delete(id);
          userCleaned.set(id, { deletedAt: task.deletedAt, purgedAt: new Date() });
          cleanedCount++;
          cleanedTaskIds.push(id);
        }
      }

      if (cleanedTaskIds.length > 0) {
        const userLog = this.getUserChangelog(uid);
        const retainedLog = userLog.filter((entry) => !cleanedTaskIds.includes(entry.task.id));
        this.changelog.set(uid, retainedLog);
      }
    }

    if (options?.onBeforeCommit) {
      await options.onBeforeCommit(null);
    }

    return { cleanedCount, cleanedTaskIds };
  }

  clear(): void {
    this.tasks.clear();
    this.mutations.clear();
    this.cleanedTombstones.clear();
    this.changelog.clear();
    this.counters.clear();
  }
}
