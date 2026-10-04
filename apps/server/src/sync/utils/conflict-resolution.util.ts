import type { MutationPayload, TaskEntity, TaskKind, TaskPriority } from '@orbit/shared-types';
import { TaskEntityModel } from '../../database/entities/task.entity.js';

export const MERGEABLE_TASK_FIELDS = [
  'projectId',
  'title',
  'content',
  'desc',
  'kind',
  'priority',
  'isAllDay',
  'startDate',
  'dueDate',
  'timeZone',
  'repeatFlag',
  'reminders',
  'items',
  'completedAt',
  'deletedAt'
] as const;

export type MergeableTaskField = (typeof MERGEABLE_TASK_FIELDS)[number];

export interface MergeTaskFieldsResult {
  task: TaskEntityModel;
  status: 'APPLIED' | 'CONFLICT_MERGED';
  winningFields: MergeableTaskField[];
  losingFields: MergeableTaskField[];
}

/**
 * Pure deterministic field-level conflict resolution (Last-Write-Wins) for task mutations.
 *
 * Rules (sync-protocol.md §7):
 * 1. Higher field timestamp wins.
 * 2. If timestamps are identical, lexicographical comparison of mutation.id vs task.lastMutationId
 *    is used as a deterministic tie-breaker (greater string wins).
 * 3. deletedAt is treated like any other field with its own timestamp.
 * 4. If all fields from mutation win without conflict against newer/divergent server state, status is APPLIED.
 *    If some fields win and some lose, or if merging occurred against divergent fields, status is CONFLICT_MERGED.
 */
export function mergeTaskFieldsWithLww(
  existingTask: TaskEntityModel | null | undefined,
  mutation: MutationPayload,
  userId: string
): MergeTaskFieldsResult {
  const payload = mutation.payload as Partial<TaskEntity>;

  if (!existingTask) {
    const task = new TaskEntityModel();
    task.id = mutation.entityId;
    task.userId = userId;
    task.projectId = (payload.projectId as string) ?? 'inbox';
    task.title = (payload.title as string) ?? '';
    task.content = (payload.content as string) ?? null;
    task.desc = (payload.desc as string) ?? null;
    task.kind = (payload.kind as TaskKind) ?? 'TASK';
    task.priority = (payload.priority as TaskPriority) ?? 0;
    task.isAllDay = Boolean(payload.isAllDay);
    task.startDate = (payload.startDate as string) ?? null;
    task.dueDate = (payload.dueDate as string) ?? null;
    task.timeZone = (payload.timeZone as string) ?? 'UTC';
    task.repeatFlag = (payload.repeatFlag as string) ?? null;
    task.reminders = Array.isArray(payload.reminders) ? payload.reminders : [];
    task.items = Array.isArray(payload.items) ? payload.items : [];
    task.completedAt = (payload.completedAt as string) ?? null;
    task.deletedAt =
      mutation.operation === 'DELETE'
        ? ((payload.deletedAt as string) ?? mutation.createdAt)
        : ((payload.deletedAt as string) ?? null);
    task.createdAt = (payload.createdAt as string) ?? mutation.createdAt;
    task.updatedAt = (payload.updatedAt as string) ?? mutation.createdAt;

    const initialTimestamps: Record<string, string> = {};
    const winningFields: MergeableTaskField[] = [];

    for (const field of MERGEABLE_TASK_FIELDS) {
      if (
        payload[field] !== undefined ||
        (field === 'deletedAt' && mutation.operation === 'DELETE')
      ) {
        winningFields.push(field);
        initialTimestamps[field] =
          mutation.fieldTimestamps?.[field] ?? mutation.createdAt;
      }
    }

    task.fieldTimestamps = initialTimestamps;
    task.lastMutationId = mutation.id;

    return {
      task,
      status: 'APPLIED',
      winningFields,
      losingFields: []
    };
  }

  const task = existingTask;
  const initialFieldTimestamps: Record<string, string> = {
    ...(task.fieldTimestamps ?? {})
  };
  const updatedFieldTimestamps: Record<string, string> = {
    ...initialFieldTimestamps
  };

  const fieldsToEvaluate: MergeableTaskField[] = [];

  for (const field of MERGEABLE_TASK_FIELDS) {
    if (payload[field] !== undefined) {
      fieldsToEvaluate.push(field);
    }
  }

  if (mutation.operation === 'DELETE' && !fieldsToEvaluate.includes('deletedAt')) {
    fieldsToEvaluate.push('deletedAt');
  }

  const winningFields: MergeableTaskField[] = [];
  const losingFields: MergeableTaskField[] = [];

  for (const field of fieldsToEvaluate) {
    const incomingTime =
      mutation.fieldTimestamps?.[field] ?? mutation.createdAt;

    let existingTime = initialFieldTimestamps[field];
    if (!existingTime) {
      if (field === 'deletedAt' && task.deletedAt) {
        existingTime = task.deletedAt;
      } else if (field === 'completedAt' && task.completedAt) {
        existingTime = task.completedAt;
      } else {
        existingTime = task.updatedAt ?? task.createdAt ?? '';
      }
    }

    let incomingWins: boolean;

    if (incomingTime > existingTime) {
      incomingWins = true;
    } else if (incomingTime < existingTime) {
      incomingWins = false;
    } else {
      // Rule 2: Timestamps are identical. Use lexicographical comparison of mutation.id vs existing task.lastMutationId
      const existingMutationId = task.lastMutationId ?? '';
      if (mutation.id > existingMutationId) {
        incomingWins = true;
      } else {
        incomingWins = false;
      }
    }

    if (incomingWins) {
      winningFields.push(field);
      updatedFieldTimestamps[field] = incomingTime;

      if (field === 'deletedAt') {
        task.deletedAt =
          mutation.operation === 'DELETE' && payload.deletedAt === undefined
            ? mutation.createdAt
            : (payload.deletedAt ?? null);
      } else if (field === 'completedAt') {
        task.completedAt = payload.completedAt ?? null;
      } else if (field === 'reminders') {
        task.reminders = Array.isArray(payload.reminders) ? payload.reminders : [];
      } else if (field === 'items') {
        task.items = Array.isArray(payload.items) ? payload.items : [];
      } else if (field === 'isAllDay') {
        task.isAllDay = Boolean(payload.isAllDay);
      } else if (field === 'priority') {
        task.priority = (payload.priority as TaskPriority) ?? 0;
      } else if (field === 'kind') {
        task.kind = (payload.kind as TaskKind) ?? 'TASK';
      } else if (field === 'title') {
        task.title = (payload.title as string) ?? '';
      } else if (field === 'projectId') {
        task.projectId = (payload.projectId as string) ?? 'inbox';
      } else if (field === 'timeZone') {
        task.timeZone = (payload.timeZone as string) ?? 'UTC';
      } else {
        (task as unknown as Record<string, unknown>)[field] = payload[field] ?? null;
      }
    } else {
      losingFields.push(field);
    }
  }

  if (winningFields.length > 0) {
    task.fieldTimestamps = updatedFieldTimestamps;
    task.lastMutationId = mutation.id;

    const incomingUpdatedAt = (payload.updatedAt as string) ?? mutation.createdAt;
    task.updatedAt =
      task.updatedAt && task.updatedAt > incomingUpdatedAt
        ? task.updatedAt
        : incomingUpdatedAt;
  }

  const hasLosingFields = losingFields.length > 0;
  const isDivergent =
    mutation.baseVersion !== undefined &&
    mutation.baseVersion < existingTask.version;

  const status: 'APPLIED' | 'CONFLICT_MERGED' =
    hasLosingFields || isDivergent ? 'CONFLICT_MERGED' : 'APPLIED';

  return {
    task,
    status,
    winningFields,
    losingFields
  };
}
