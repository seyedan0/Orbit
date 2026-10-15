import type { SyncQueueEntry, TaskEntity, TaskPriority } from '@orbit/shared-types';
import type { AtomicTaskStore } from '@orbit/sync-engine';
import {
  completeTask,
  deleteTask,
  restoreTask,
  TaskNotFoundError,
  type TaskServiceDeps
} from './task-service';

/**
 * Bulk completes multiple tasks atomically with sync mutation registration.
 */
export async function bulkCompleteTasks(
  store: AtomicTaskStore,
  taskIds: string[],
  deps: TaskServiceDeps
): Promise<TaskEntity[]> {
  const updated: TaskEntity[] = [];
  for (const id of taskIds) {
    try {
      const task = await completeTask(id, deps);
      updated.push(task);
    } catch (err) {
      if (!(err instanceof TaskNotFoundError)) {
        throw err;
      }
    }
  }
  return updated;
}

/**
 * Bulk soft-deletes multiple tasks atomically with sync mutation registration.
 */
export async function bulkDeleteTasks(
  store: AtomicTaskStore,
  taskIds: string[],
  deps: TaskServiceDeps
): Promise<TaskEntity[]> {
  const updated: TaskEntity[] = [];
  for (const id of taskIds) {
    try {
      const task = await deleteTask(id, deps);
      updated.push(task);
    } catch (err) {
      if (!(err instanceof TaskNotFoundError)) {
        throw err;
      }
    }
  }
  return updated;
}

/**
 * Bulk restores multiple soft-deleted tasks atomically.
 */
export async function bulkRestoreTasks(
  store: AtomicTaskStore,
  taskIds: string[],
  deps: TaskServiceDeps
): Promise<TaskEntity[]> {
  const updated: TaskEntity[] = [];
  for (const id of taskIds) {
    try {
      const task = await restoreTask(id, deps);
      updated.push(task);
    } catch (err) {
      if (!(err instanceof TaskNotFoundError)) {
        throw err;
      }
    }
  }
  return updated;
}

/**
 * Bulk updates the priority of multiple tasks with atomic LWW field mutations.
 */
export async function bulkUpdatePriority(
  store: AtomicTaskStore,
  taskIds: string[],
  priority: TaskPriority,
  deps: TaskServiceDeps
): Promise<TaskEntity[]> {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const updated: TaskEntity[] = [];

  for (const id of taskIds) {
    const task = await store.getTask(id);
    if (!task || task.deletedAt != null) continue;
    if (task.priority === priority) {
      updated.push(task);
      continue;
    }

    const timestamp = now().toISOString();
    const mutationId = newId();
    const nextLocalStatus = task.localStatus === 'CREATED' ? 'CREATED' : 'UPDATED';

    const updatedTask: TaskEntity = {
      ...task,
      priority,
      updatedAt: timestamp,
      localStatus: nextLocalStatus
    };

    const mutation: SyncQueueEntry = {
      id: mutationId,
      idempotencyKey: mutationId,
      entityType: 'TASK',
      entityId: task.id,
      operation: 'UPDATE',
      baseVersion: task.version,
      payloadType: 'PARTIAL',
      payload: { priority },
      fieldTimestamps: { priority: timestamp },
      createdAt: timestamp,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: timestamp
    };

    await store.saveTaskWithMutation(updatedTask, mutation);
    updated.push(updatedTask);
  }

  return updated;
}

/**
 * Bulk adds a tag to multiple tasks without duplicates with atomic LWW field mutations.
 */
export async function bulkAddTag(
  store: AtomicTaskStore,
  taskIds: string[],
  tagId: string,
  deps: TaskServiceDeps
): Promise<TaskEntity[]> {
  const cleanTag = tagId.trim();
  if (!cleanTag) return [];

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const updated: TaskEntity[] = [];

  for (const id of taskIds) {
    const task = await store.getTask(id);
    if (!task || task.deletedAt != null) continue;

    const currentTags = task.tags ?? [];
    if (currentTags.includes(cleanTag)) {
      updated.push(task);
      continue;
    }

    const timestamp = now().toISOString();
    const mutationId = newId();
    const nextLocalStatus = task.localStatus === 'CREATED' ? 'CREATED' : 'UPDATED';
    const nextTags = [...currentTags, cleanTag];

    const updatedTask: TaskEntity = {
      ...task,
      tags: nextTags,
      updatedAt: timestamp,
      localStatus: nextLocalStatus
    };

    const mutation: SyncQueueEntry = {
      id: mutationId,
      idempotencyKey: mutationId,
      entityType: 'TASK',
      entityId: task.id,
      operation: 'UPDATE',
      baseVersion: task.version,
      payloadType: 'PARTIAL',
      payload: { tags: nextTags },
      fieldTimestamps: { tags: timestamp },
      createdAt: timestamp,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: timestamp
    };

    await store.saveTaskWithMutation(updatedTask, mutation);
    updated.push(updatedTask);
  }

  return updated;
}
