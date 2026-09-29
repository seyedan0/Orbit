import type { SyncQueueEntry, TaskEntity } from '@orbit/shared-types';
import type { AtomicTaskStore } from '@orbit/sync-engine';

/**
 * Well-known projectId for the user's default Inbox.
 * Phase 3 (account system) will replace this with a per-user list ID.
 */
export const INBOX_PROJECT_ID = 'inbox';

export interface CreateTaskInput {
  title: string;
}

export interface TaskServiceDeps {
  store: AtomicTaskStore;
  userId: string;
  /** Override for testing. Defaults to `crypto.randomUUID()`. */
  newId?: () => string;
  /** Override for testing. Defaults to `new Date()`. */
  now?: () => Date;
  /** IANA timezone override for testing. Defaults to the browser's local timezone. */
  timeZone?: string;
}

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

/**
 * Creates a TASK in the Inbox atomically: saves the TaskEntity and its
 * CREATE mutation in a single `saveTaskWithMutation` call so that a crash
 * between the two writes is impossible.
 *
 * Blank titles (after trimming) are rejected synchronously with a
 * {@link TaskValidationError} before touching storage.
 */
export async function createTask(
  input: CreateTaskInput,
  deps: TaskServiceDeps
): Promise<TaskEntity> {
  const title = input.title.trim();
  if (title.length === 0) {
    throw new TaskValidationError('عنوان task نمی‌تواند خالی باشد');
  }

  const newId = deps.newId ?? (() => crypto.randomUUID());
  const now = deps.now ?? (() => new Date());
  const timeZone =
    deps.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const timestamp = now().toISOString();
  const taskId = newId();
  const mutationId = newId();

  const task: TaskEntity = {
    id: taskId,
    projectId: INBOX_PROJECT_ID,
    userId: deps.userId,
    title,
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    timeZone,
    reminders: [],
    items: [],
    version: 0,
    localStatus: 'CREATED',
    createdAt: timestamp,
    updatedAt: timestamp
  };

  // fieldTimestamps enable field-level LWW conflict resolution (sync-protocol.md §7).
  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: taskId, // task ID is stable across retries
    entityType: 'TASK',
    entityId: taskId,
    operation: 'CREATE',
    baseVersion: 0,
    payloadType: 'FULL',
    payload: task,
    fieldTimestamps: {
      title: timestamp,
      kind: timestamp,
      priority: timestamp,
      isAllDay: timestamp,
      timeZone: timestamp,
      reminders: timestamp,
      items: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTaskWithMutation(task, mutation);
  return task;
}
