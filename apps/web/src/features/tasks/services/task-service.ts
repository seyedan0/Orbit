import type { SyncQueueEntry, TaskEntity } from '@orbit/shared-types';
import type { AtomicTaskStore } from '@orbit/sync-engine';

/**
 * Well-known projectId for the user's default Inbox.
 * Phase 3 (account system) will replace this with a per-user list ID.
 */
export const INBOX_PROJECT_ID = 'inbox';

export interface CreateTaskInput {
  title: string;
  dueDate?: string | null;
  startDate?: string | null;
  isAllDay?: boolean;
  allDay?: boolean;
  timeZone?: string;
  timezone?: string | null;
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

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`تسک با شناسه ${id} یافت نشد`);
    this.name = 'TaskNotFoundError';
  }
}

export class InvalidTaskKindError extends Error {
  constructor(message = 'تنها موجودیت‌های نوع TASK قابل تکمیل یا بازگشایی هستند') {
    super(message);
    this.name = 'InvalidTaskKindError';
  }
}

export interface CompleteTaskDeps extends TaskServiceDeps {
  idempotencyKey?: string;
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

  if (
    input.startDate &&
    input.dueDate &&
    new Date(input.startDate).getTime() > new Date(input.dueDate).getTime()
  ) {
    throw new TaskValidationError(
      'تاریخ سررسید نمی‌تواند قبل از تاریخ شروع باشد'
    );
  }

  const newId = deps.newId ?? (() => crypto.randomUUID());
  const now = deps.now ?? (() => new Date());
  const isAllDay = Boolean(input.isAllDay ?? input.allDay ?? false);
  const startDate = input.startDate ?? null;
  const dueDate = input.dueDate ?? null;
  const timeZone =
    input.timeZone ??
    input.timezone ??
    deps.timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;

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
    isAllDay,
    allDay: isAllDay,
    startDate,
    dueDate,
    timeZone,
    timezone: timeZone,
    reminders: [],
    items: [],
    version: 0,
    localStatus: 'CREATED',
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null
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
      items: timestamp,
      ...(startDate !== null ? { startDate: timestamp } : {}),
      ...(dueDate !== null ? { dueDate: timestamp } : {})
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTaskWithMutation(task, mutation);
  return task;
}

/**
 * Completes a TASK item atomically:
 * 1. Verifies that the task exists and is of kind TASK (NOTE cannot be completed as a TASK).
 * 2. Idempotent: If already completed, returns the task without modifying storage or adding mutations.
 * 3. Sets completedAt and updates updatedAt to the current timestamp.
 * 4. Sets localStatus to CREATED (if originally CREATED) or UPDATED (if SYNCED).
 * 5. Creates a partial UPDATE mutation for sync with field-level timestamps.
 * 6. Persists the task and mutation atomically in the local store.
 */
export async function completeTask(
  taskId: string,
  deps: CompleteTaskDeps
): Promise<TaskEntity> {
  const task = await deps.store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }
  if (task.kind !== 'TASK') {
    throw new InvalidTaskKindError(
      `تنها موجودیت‌های نوع TASK قابل تکمیل هستند (نوع فعلی: ${task.kind})`
    );
  }
  if (task.completedAt != null) {
    return task;
  }

  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const mutationId = newId();
  const idempotencyKey = deps.idempotencyKey ?? mutationId;

  const nextLocalStatus = task.localStatus === 'CREATED' ? 'CREATED' : 'UPDATED';

  const updatedTask: TaskEntity = {
    ...task,
    completedAt: timestamp,
    updatedAt: timestamp,
    localStatus: nextLocalStatus
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey,
    entityType: 'TASK',
    entityId: task.id,
    operation: 'UPDATE',
    baseVersion: task.version,
    payloadType: 'PARTIAL',
    payload: {
      completedAt: timestamp
    },
    fieldTimestamps: {
      completedAt: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
}

/**
 * Reopens a completed TASK item atomically:
 * 1. Verifies that the task exists and is of kind TASK.
 * 2. Idempotent: If already open (completedAt == null), returns the task without modifying storage.
 * 3. Sets completedAt to null and updates updatedAt to current timestamp.
 * 4. Sets localStatus to CREATED or UPDATED.
 * 5. Creates a partial UPDATE mutation setting completedAt: null with current field timestamp.
 * 6. Persists the task and mutation atomically in the local store.
 */
export async function reopenTask(
  taskId: string,
  deps: CompleteTaskDeps
): Promise<TaskEntity> {
  const task = await deps.store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }
  if (task.kind !== 'TASK') {
    throw new InvalidTaskKindError(
      `تنها موجودیت‌های نوع TASK قابل بازگشایی هستند (نوع فعلی: ${task.kind})`
    );
  }
  if (task.completedAt == null) {
    return task;
  }

  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const mutationId = newId();
  const idempotencyKey = deps.idempotencyKey ?? mutationId;

  const nextLocalStatus = task.localStatus === 'CREATED' ? 'CREATED' : 'UPDATED';

  const updatedTask: TaskEntity = {
    ...task,
    completedAt: null,
    updatedAt: timestamp,
    localStatus: nextLocalStatus
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey,
    entityType: 'TASK',
    entityId: task.id,
    operation: 'UPDATE',
    baseVersion: task.version,
    payloadType: 'PARTIAL',
    payload: {
      completedAt: null
    },
    fieldTimestamps: {
      completedAt: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
}

export interface DeleteTaskDeps extends TaskServiceDeps {
  idempotencyKey?: string;
}

export interface RestoreTaskDeps extends TaskServiceDeps {
  idempotencyKey?: string;
}

/**
 * Soft deletes a task (TASK, NOTE, CHECKLIST) atomically:
 * 1. Verifies that the task exists in storage.
 * 2. Idempotent: If already deleted (deletedAt != null), returns task as-is without extra mutation.
 * 3. Sets deletedAt and updatedAt to the current timestamp.
 * 4. Sets localStatus to 'DELETED'.
 * 5. Creates a partial UPDATE mutation for sync with fieldTimestamps.deletedAt.
 * 6. Persists the task and mutation atomically using saveTaskWithMutation.
 * 7. Does NOT physically remove the task from storage.
 */
export async function deleteTask(
  taskId: string,
  deps: DeleteTaskDeps
): Promise<TaskEntity> {
  const task = await deps.store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }
  if (task.deletedAt != null) {
    return task;
  }

  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const mutationId = newId();
  const idempotencyKey = deps.idempotencyKey ?? mutationId;

  const updatedTask: TaskEntity = {
    ...task,
    deletedAt: timestamp,
    updatedAt: timestamp,
    localStatus: 'DELETED'
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey,
    entityType: 'TASK',
    entityId: task.id,
    operation: 'UPDATE',
    baseVersion: task.version,
    payloadType: 'PARTIAL',
    payload: {
      deletedAt: timestamp
    },
    fieldTimestamps: {
      deletedAt: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
}

/**
 * Restores a soft-deleted task (TASK, NOTE, CHECKLIST) atomically:
 * 1. Verifies that the task exists in storage.
 * 2. Idempotent: If already active (deletedAt == null), returns task as-is without extra mutation.
 * 3. Sets deletedAt to null and updates updatedAt to the current timestamp.
 * 4. Sets localStatus to 'CREATED' (if version === 0) or 'UPDATED'.
 * 5. Creates a partial UPDATE mutation for sync setting deletedAt: null with fieldTimestamps.deletedAt.
 * 6. Persists the task and mutation atomically using saveTaskWithMutation.
 * 7. Restored task reappears in listTasks.
 */
export async function restoreTask(
  taskId: string,
  deps: RestoreTaskDeps
): Promise<TaskEntity> {
  const task = await deps.store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }
  if (task.deletedAt == null) {
    return task;
  }

  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const mutationId = newId();
  const idempotencyKey = deps.idempotencyKey ?? mutationId;

  const nextLocalStatus = task.version === 0 ? 'CREATED' : 'UPDATED';

  const updatedTask: TaskEntity = {
    ...task,
    deletedAt: null,
    updatedAt: timestamp,
    localStatus: nextLocalStatus
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey,
    entityType: 'TASK',
    entityId: task.id,
    operation: 'UPDATE',
    baseVersion: task.version,
    payloadType: 'PARTIAL',
    payload: {
      deletedAt: null
    },
    fieldTimestamps: {
      deletedAt: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
}

export interface ScheduleTaskInput {
  dueDate?: string | null;
  startDate?: string | null;
  isAllDay?: boolean;
  allDay?: boolean;
  timeZone?: string;
  timezone?: string | null;
}

export interface ScheduleTaskDeps extends TaskServiceDeps {
  idempotencyKey?: string;
}

/**
 * Schedules or reschedules a task (setting/updating/clearing startDate and dueDate):
 * 1. Verifies that the task exists in storage.
 * 2. Validates that startDate <= dueDate when both are non-null.
 * 3. Sets localStatus to CREATED (if version === 0) or UPDATED.
 * 4. Generates a partial UPDATE mutation with precise fieldTimestamps for sync protocol LWW.
 * 5. Persists the task and mutation atomically using saveTaskWithMutation.
 */
export async function scheduleTask(
  taskId: string,
  input: ScheduleTaskInput,
  deps: ScheduleTaskDeps
): Promise<TaskEntity> {
  const task = await deps.store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  const effectiveStartDate =
    input.startDate !== undefined ? input.startDate : task.startDate;
  const effectiveDueDate =
    input.dueDate !== undefined ? input.dueDate : task.dueDate;

  if (
    effectiveStartDate &&
    effectiveDueDate &&
    new Date(effectiveStartDate).getTime() > new Date(effectiveDueDate).getTime()
  ) {
    throw new TaskValidationError(
      'تاریخ سررسید نمی‌تواند قبل از تاریخ شروع باشد'
    );
  }

  const isAllDayChanged =
    input.isAllDay !== undefined || input.allDay !== undefined;
  const nextIsAllDay = isAllDayChanged
    ? Boolean(input.isAllDay ?? input.allDay)
    : task.isAllDay;

  const nextStartDate: string | null =
    input.startDate !== undefined ? input.startDate : (task.startDate ?? null);
  const nextDueDate: string | null =
    input.dueDate !== undefined ? input.dueDate : (task.dueDate ?? null);

  const timeZoneChanged =
    input.timeZone !== undefined || input.timezone !== undefined;
  const nextTimeZone = timeZoneChanged
    ? (input.timeZone ?? input.timezone ?? task.timeZone)
    : task.timeZone;

  // Check if anything actually changed
  if (
    !isAllDayChanged &&
    !timeZoneChanged &&
    input.startDate === undefined &&
    input.dueDate === undefined
  ) {
    return task;
  }

  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const mutationId = newId();
  const idempotencyKey = deps.idempotencyKey ?? mutationId;

  const nextLocalStatus = task.version === 0 ? 'CREATED' : 'UPDATED';

  const updatedTask: TaskEntity = {
    ...task,
    isAllDay: nextIsAllDay,
    allDay: nextIsAllDay,
    startDate: nextStartDate,
    dueDate: nextDueDate,
    timeZone: nextTimeZone,
    timezone: nextTimeZone,
    updatedAt: timestamp,
    localStatus: nextLocalStatus
  };

  const payload: Partial<TaskEntity> = {};
  const fieldTimestamps: Record<string, string> = {};

  if (input.dueDate !== undefined) {
    payload.dueDate = nextDueDate;
    fieldTimestamps.dueDate = timestamp;
  }
  if (input.startDate !== undefined) {
    payload.startDate = nextStartDate;
    fieldTimestamps.startDate = timestamp;
  }
  if (isAllDayChanged) {
    payload.isAllDay = nextIsAllDay;
    payload.allDay = nextIsAllDay;
    fieldTimestamps.isAllDay = timestamp;
  }
  if (timeZoneChanged) {
    payload.timeZone = nextTimeZone;
    payload.timezone = nextTimeZone;
    fieldTimestamps.timeZone = timestamp;
  }

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey,
    entityType: 'TASK',
    entityId: task.id,
    operation: 'UPDATE',
    baseVersion: task.version,
    payloadType: 'PARTIAL',
    payload,
    fieldTimestamps,
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
}

/**
 * Returns the calendar date key (YYYY-MM-DD) in the specified or local timezone.
 */
export function getLocalDateKey(date: Date, timeZone?: string): string {
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Returns true if an active task has a dueDate matching referenceDate's calendar day.
 */
export function isDueToday(
  task: TaskEntity,
  referenceDate: Date = new Date(),
  timeZone?: string
): boolean {
  if (!task.dueDate || task.deletedAt != null) return false;
  const taskDate = new Date(task.dueDate);
  if (isNaN(taskDate.getTime())) return false;
  const targetTz = timeZone ?? task.timeZone;
  return getLocalDateKey(taskDate, targetTz) === getLocalDateKey(referenceDate, targetTz);
}

/**
 * Returns true if an active task has a dueDate matching the day after referenceDate.
 */
export function isDueTomorrow(
  task: TaskEntity,
  referenceDate: Date = new Date(),
  timeZone?: string
): boolean {
  if (!task.dueDate || task.deletedAt != null) return false;
  const taskDate = new Date(task.dueDate);
  if (isNaN(taskDate.getTime())) return false;
  const targetTz = timeZone ?? task.timeZone;

  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getLocalDateKey(taskDate, targetTz) === getLocalDateKey(tomorrow, targetTz);
}

/**
 * Filters and returns active tasks due Today, sorted by completion status, priority, and due time.
 */
export function filterTasksDueToday(
  tasks: TaskEntity[],
  referenceDate: Date = new Date(),
  timeZone?: string
): TaskEntity[] {
  return tasks
    .filter((t) => isDueToday(t, referenceDate, timeZone))
    .sort((a, b) => {
      if (Boolean(a.completedAt) !== Boolean(b.completedAt)) {
        return a.completedAt ? 1 : -1;
      }
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

/**
 * Filters and returns active tasks due Tomorrow, sorted by completion status, priority, and due time.
 */
export function filterTasksDueTomorrow(
  tasks: TaskEntity[],
  referenceDate: Date = new Date(),
  timeZone?: string
): TaskEntity[] {
  return tasks
    .filter((t) => isDueTomorrow(t, referenceDate, timeZone))
    .sort((a, b) => {
      if (Boolean(a.completedAt) !== Boolean(b.completedAt)) {
        return a.completedAt ? 1 : -1;
      }
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}
