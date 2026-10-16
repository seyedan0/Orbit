import type {
  SubTaskItem,
  SyncQueueEntry,
  TaskDeliveryStatus,
  TaskEntity,
  TaskPriority
} from '@orbit/shared-types';
import type { AtomicTaskStore } from '@orbit/sync-engine';
import { getNextOccurrenceDate, parseRRule } from '../../../core/recurrence/recurrence';
import { generateLexoRank } from '../../../core/ranking/lexorank';
import { promoteSubtaskToTask } from '../../../core/tasks/subtask-tree';

/**
 * Well-known projectId for the user's default Inbox.
 * Phase 3 (account system) will replace this with a per-user list ID.
 */
export const INBOX_PROJECT_ID = 'inbox';

export interface CreateTaskInput {
  title: string;
  desc?: string | null | undefined;
  content?: string | null | undefined;
  priority?: TaskPriority | undefined;
  dueDate?: string | null | undefined;
  startDate?: string | null | undefined;
  duration?: number | null | undefined;
  isAllDay?: boolean | undefined;
  allDay?: boolean | undefined;
  timeZone?: string | undefined;
  timezone?: string | null | undefined;
  repeatFlag?: string | null | undefined;
  reminders?: string[] | undefined;
  tags?: string[] | undefined;
  items?: SubTaskItem[] | undefined;
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
  const duration = input.duration ?? null;
  const repeatFlag = input.repeatFlag ?? null;
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
    desc: (input.desc ?? input.content) ?? undefined,
    content: (input.content ?? input.desc) ?? undefined,
    kind: 'TASK',
    priority: input.priority ?? 0,
    isAllDay,
    allDay: isAllDay,
    startDate,
    dueDate,
    duration,
    timeZone,
    timezone: timeZone,
    repeatFlag,
    reminders: input.reminders ? [...input.reminders] : [],
    tags: input.tags ? [...input.tags] : [],
    items: input.items ? [...input.items] : [],
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
      ...(input.desc || input.content ? { desc: timestamp } : {}),
      ...(input.tags && input.tags.length > 0 ? { tags: timestamp } : {}),
      ...(startDate !== null ? { startDate: timestamp } : {}),
      ...(dueDate !== null ? { dueDate: timestamp } : {}),
      ...(duration !== null ? { duration: timestamp } : {}),
      ...(repeatFlag !== null ? { repeatFlag: timestamp } : {})
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

  // Recurring task lifecycle handling:
  // If task has a repeatFlag, advance to the next occurrence instead of terminating.
  if (task.repeatFlag && task.repeatFlag.trim() !== '') {
    const rruleOptions = parseRRule(task.repeatFlag);
    const baseDate = task.dueDate
      ? new Date(task.dueDate)
      : task.startDate
        ? new Date(task.startDate)
        : now();

    const nextDueDateObj = getNextOccurrenceDate(baseDate, rruleOptions);
    if (nextDueDateObj) {
      const nextDueIso = nextDueDateObj.toISOString();
      let nextStartIso: string | null = null;

      if (task.startDate && task.dueDate) {
        const diffMs =
          new Date(task.dueDate).getTime() - new Date(task.startDate).getTime();
        nextStartIso = new Date(nextDueDateObj.getTime() - diffMs).toISOString();
      } else if (task.startDate && task.duration != null) {
        nextStartIso = new Date(
          nextDueDateObj.getTime() - task.duration * 60 * 1000
        ).toISOString();
      } else if (task.startDate) {
        const deltaMs = nextDueDateObj.getTime() - baseDate.getTime();
        nextStartIso = new Date(
          new Date(task.startDate).getTime() + deltaMs
        ).toISOString();
      }

      const updatedTask: TaskEntity = {
        ...task,
        dueDate: nextDueIso,
        startDate: nextStartIso,
        completedAt: null, // Reset completion for next occurrence cycle
        updatedAt: timestamp,
        localStatus: nextLocalStatus
      };

      const payload: Partial<TaskEntity> = {
        dueDate: nextDueIso,
        completedAt: null,
        updatedAt: timestamp
      };
      const fieldTimestamps: Record<string, string> = {
        dueDate: timestamp,
        completedAt: timestamp,
        updatedAt: timestamp
      };

      if (nextStartIso !== null) {
        payload.startDate = nextStartIso;
        fieldTimestamps.startDate = timestamp;
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
  }

  // Delivery performance calculation for tasks with dueDate
  let deliveryStatus: TaskDeliveryStatus | null = null;
  let completionVarianceHours: number | null = null;

  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const nowDate = now();
    const diffMs = due.getTime() - nowDate.getTime();
    completionVarianceHours = Math.round(diffMs / (1000 * 60 * 60));

    const isSameCalendarDay =
      nowDate.getFullYear() === due.getFullYear() &&
      nowDate.getMonth() === due.getMonth() &&
      nowDate.getDate() === due.getDate();

    if (nowDate.getTime() > due.getTime()) {
      deliveryStatus = 'OVERDUE';
    } else if (isSameCalendarDay) {
      deliveryStatus = 'ON_TIME';
    } else {
      deliveryStatus = 'EARLY';
    }
  }

  // Regular non-recurring task completion:
  const updatedTask: TaskEntity = {
    ...task,
    completedAt: timestamp,
    deliveryStatus,
    completionVarianceHours,
    updatedAt: timestamp,
    localStatus: nextLocalStatus
  };

  const payload: Partial<TaskEntity> = {
    completedAt: timestamp,
    ...(deliveryStatus != null ? { deliveryStatus } : {}),
    ...(completionVarianceHours != null ? { completionVarianceHours } : {})
  };

  const fieldTimestamps: Record<string, string> = {
    completedAt: timestamp,
    ...(deliveryStatus != null ? { deliveryStatus: timestamp } : {}),
    ...(completionVarianceHours != null ? { completionVarianceHours: timestamp } : {})
  };

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
    ...(task.deliveryStatus ? { deliveryStatus: null } : {}),
    ...(task.completionVarianceHours !== undefined && task.completionVarianceHours !== null
      ? { completionVarianceHours: null }
      : {}),
    updatedAt: timestamp,
    localStatus: nextLocalStatus
  };

  const payload: Partial<TaskEntity> = {
    completedAt: null,
    ...(task.deliveryStatus ? { deliveryStatus: null } : {}),
    ...(task.completionVarianceHours !== undefined && task.completionVarianceHours !== null
      ? { completionVarianceHours: null }
      : {})
  };

  const fieldTimestamps: Record<string, string> = {
    completedAt: timestamp,
    ...(task.deliveryStatus ? { deliveryStatus: timestamp } : {}),
    ...(task.completionVarianceHours !== undefined && task.completionVarianceHours !== null
      ? { completionVarianceHours: timestamp }
      : {})
  };

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
  dueDate?: string | null | undefined;
  startDate?: string | null | undefined;
  duration?: number | null | undefined;
  isAllDay?: boolean | undefined;
  allDay?: boolean | undefined;
  timeZone?: string | undefined;
  timezone?: string | null | undefined;
  repeatFlag?: string | null | undefined;
  reminders?: string[] | undefined;
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

  const nextDuration: number | null =
    input.duration !== undefined ? input.duration : (task.duration ?? null);

  const repeatFlagChanged = input.repeatFlag !== undefined;
  const nextRepeatFlag: string | null = repeatFlagChanged
    ? (input.repeatFlag ?? null)
    : (task.repeatFlag ?? null);

  const remindersChanged = input.reminders !== undefined;
  const nextReminders: string[] = remindersChanged
    ? (input.reminders ? [...input.reminders] : [])
    : (task.reminders ?? []);

  // Check if anything actually changed
  if (
    !isAllDayChanged &&
    !timeZoneChanged &&
    !repeatFlagChanged &&
    !remindersChanged &&
    input.startDate === undefined &&
    input.dueDate === undefined &&
    input.duration === undefined
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
    duration: nextDuration,
    timeZone: nextTimeZone,
    timezone: nextTimeZone,
    repeatFlag: nextRepeatFlag,
    reminders: nextReminders,
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
  if (input.duration !== undefined) {
    payload.duration = nextDuration;
    fieldTimestamps.duration = timestamp;
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
  if (repeatFlagChanged) {
    payload.repeatFlag = nextRepeatFlag;
    fieldTimestamps.repeatFlag = timestamp;
  }
  if (remindersChanged) {
    payload.reminders = nextReminders;
    fieldTimestamps.reminders = timestamp;
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

export interface RescheduleTaskUpdates {
  dueDate?: string | null | undefined;
  startDate?: string | null | undefined;
  duration?: number | null | undefined;
  isAllDay?: boolean | undefined;
  repeatFlag?: string | null | undefined;
  reminders?: string[] | undefined;
}

export interface RescheduleTaskDeps {
  userId?: string;
  idempotencyKey?: string;
  now?: () => Date;
  newId?: () => string;
}

/**
 * Atomically reschedules a task (updating dueDate, startDate, duration, and isAllDay):
 * 1. Verifies that the task exists in storage.
 * 2. Validates that startDate <= dueDate when both are non-null.
 * 3. Validates duration is non-negative when provided.
 * 4. Generates a partial UPDATE mutation with precise fieldTimestamps for LWW sync protocol.
 * 5. Saves atomically via store.saveTaskWithMutation.
 */
export async function rescheduleTask(
  store: AtomicTaskStore,
  taskId: string,
  updates: RescheduleTaskUpdates,
  deps: RescheduleTaskDeps = {}
): Promise<TaskEntity> {
  const task = await store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  const nextStartDate: string | null =
    updates.startDate !== undefined ? updates.startDate : (task.startDate ?? null);
  const nextDueDate: string | null =
    updates.dueDate !== undefined ? updates.dueDate : (task.dueDate ?? null);

  if (
    nextStartDate &&
    nextDueDate &&
    new Date(nextStartDate).getTime() > new Date(nextDueDate).getTime()
  ) {
    throw new TaskValidationError(
      'تاریخ سررسید نمی‌تواند قبل از تاریخ شروع باشد'
    );
  }

  if (
    updates.duration !== undefined &&
    updates.duration !== null &&
    updates.duration < 0
  ) {
    throw new TaskValidationError('مدت‌زمان نمی‌تواند منفی باشد');
  }

  const isAllDayChanged = updates.isAllDay !== undefined;
  const nextIsAllDay = isAllDayChanged ? Boolean(updates.isAllDay) : task.isAllDay;

  const nextDuration: number | null =
    updates.duration !== undefined ? updates.duration : (task.duration ?? null);

  const repeatFlagChanged = updates.repeatFlag !== undefined;
  const nextRepeatFlag: string | null = repeatFlagChanged
    ? (updates.repeatFlag ?? null)
    : (task.repeatFlag ?? null);

  const remindersChanged = updates.reminders !== undefined;
  const nextReminders: string[] = remindersChanged
    ? (updates.reminders ? [...updates.reminders] : [])
    : (task.reminders ?? []);

  // Check if anything actually changed
  if (
    !isAllDayChanged &&
    !repeatFlagChanged &&
    !remindersChanged &&
    updates.startDate === undefined &&
    updates.dueDate === undefined &&
    updates.duration === undefined
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
    duration: nextDuration,
    repeatFlag: nextRepeatFlag,
    reminders: nextReminders,
    updatedAt: timestamp,
    localStatus: nextLocalStatus
  };

  const payload: Partial<TaskEntity> = {};
  const fieldTimestamps: Record<string, string> = {};

  if (updates.dueDate !== undefined) {
    payload.dueDate = nextDueDate;
    fieldTimestamps.dueDate = timestamp;
  }
  if (updates.startDate !== undefined) {
    payload.startDate = nextStartDate;
    fieldTimestamps.startDate = timestamp;
  }
  if (updates.duration !== undefined) {
    payload.duration = nextDuration;
    fieldTimestamps.duration = timestamp;
  }
  if (isAllDayChanged) {
    payload.isAllDay = nextIsAllDay;
    payload.allDay = nextIsAllDay;
    fieldTimestamps.isAllDay = timestamp;
  }
  if (repeatFlagChanged) {
    payload.repeatFlag = nextRepeatFlag;
    fieldTimestamps.repeatFlag = timestamp;
  }
  if (remindersChanged) {
    payload.reminders = nextReminders;
    fieldTimestamps.reminders = timestamp;
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

  await store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
}

export interface UpdateTaskInput {
  title?: string | undefined;
  priority?: TaskPriority | undefined;
  dueDate?: string | null | undefined;
  startDate?: string | null | undefined;
  duration?: number | null | undefined;
  isAllDay?: boolean | undefined;
  repeatFlag?: string | null | undefined;
  reminders?: string[] | undefined;
  tags?: string[] | undefined;
}

export interface UpdateTaskDeps extends TaskServiceDeps {
  idempotencyKey?: string;
}

/**
 * Atomically updates a task's mutable fields with field-level LWW conflict resolution:
 * 1. Verifies that the task exists in storage.
 * 2. Validates title (non-empty), dates (startDate <= dueDate), and duration (non-negative).
 * 3. Generates a partial UPDATE mutation for changed fields with corresponding fieldTimestamps.
 * 4. Saves the updated TaskEntity and mutation atomically in the local store.
 */
export async function updateTask(
  taskId: string,
  updates: UpdateTaskInput,
  deps: UpdateTaskDeps
): Promise<TaskEntity> {
  const task = await deps.store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  if (updates.title !== undefined) {
    const trimmedTitle = updates.title.trim();
    if (trimmedTitle.length === 0) {
      throw new TaskValidationError('عنوان task نمی‌تواند خالی باشد');
    }
  }

  const nextStartDate: string | null =
    updates.startDate !== undefined ? updates.startDate : (task.startDate ?? null);
  const nextDueDate: string | null =
    updates.dueDate !== undefined ? updates.dueDate : (task.dueDate ?? null);

  if (
    nextStartDate &&
    nextDueDate &&
    new Date(nextStartDate).getTime() > new Date(nextDueDate).getTime()
  ) {
    throw new TaskValidationError(
      'تاریخ سررسید نمی‌تواند قبل از تاریخ شروع باشد'
    );
  }

  if (
    updates.duration !== undefined &&
    updates.duration !== null &&
    updates.duration < 0
  ) {
    throw new TaskValidationError('مدت‌زمان نمی‌تواند منفی باشد');
  }

  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const mutationId = newId();
  const idempotencyKey = deps.idempotencyKey ?? mutationId;

  const nextLocalStatus = task.version === 0 ? 'CREATED' : 'UPDATED';

  const isAllDayChanged = updates.isAllDay !== undefined;
  const nextIsAllDay = isAllDayChanged ? Boolean(updates.isAllDay) : task.isAllDay;

  const nextPriority: TaskPriority =
    updates.priority !== undefined ? updates.priority : task.priority;

  const updatedTask: TaskEntity = {
    ...task,
    ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    priority: nextPriority,
    isAllDay: nextIsAllDay,
    allDay: nextIsAllDay,
    startDate: nextStartDate,
    dueDate: nextDueDate,
    duration: updates.duration !== undefined ? updates.duration : task.duration,
    ...(updates.repeatFlag !== undefined ? { repeatFlag: updates.repeatFlag } : {}),
    ...(updates.reminders !== undefined ? { reminders: [...updates.reminders] } : {}),
    ...(updates.tags !== undefined ? { tags: [...updates.tags] } : {}),
    updatedAt: timestamp,
    localStatus: nextLocalStatus
  };

  const payload: Partial<TaskEntity> = {};
  const fieldTimestamps: Record<string, string> = {};

  if (updates.title !== undefined) {
    payload.title = updatedTask.title;
    fieldTimestamps.title = timestamp;
  }
  if (updates.priority !== undefined) {
    payload.priority = updatedTask.priority;
    fieldTimestamps.priority = timestamp;
  }
  if (updates.dueDate !== undefined) {
    payload.dueDate = updatedTask.dueDate;
    fieldTimestamps.dueDate = timestamp;
  }
  if (updates.startDate !== undefined) {
    payload.startDate = updatedTask.startDate;
    fieldTimestamps.startDate = timestamp;
  }
  if (updates.duration !== undefined) {
    payload.duration = updatedTask.duration;
    fieldTimestamps.duration = timestamp;
  }
  if (isAllDayChanged) {
    payload.isAllDay = nextIsAllDay;
    payload.allDay = nextIsAllDay;
    fieldTimestamps.isAllDay = timestamp;
  }
  if (updates.repeatFlag !== undefined) {
    payload.repeatFlag = updatedTask.repeatFlag;
    fieldTimestamps.repeatFlag = timestamp;
  }
  if (updates.reminders !== undefined) {
    payload.reminders = updatedTask.reminders;
    fieldTimestamps.reminders = timestamp;
  }
  if (updates.tags !== undefined) {
    payload.tags = updatedTask.tags;
    fieldTimestamps.tags = timestamp;
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
 * Returns true if an active task spans across the target calendar day
 * (completedAt == null AND startDate <= targetDate && targetDate <= dueDate).
 */
export function isTaskActiveForDate(
  task: TaskEntity,
  targetDate: Date | string = new Date(),
  timeZone?: string
): boolean {
  if (task.completedAt != null || task.deletedAt != null) {
    return false;
  }
  if (!task.startDate || !task.dueDate) {
    return false;
  }

  const targetDateObj = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const startDateObj = new Date(task.startDate);
  const dueDateObj = new Date(task.dueDate);

  if (
    isNaN(targetDateObj.getTime()) ||
    isNaN(startDateObj.getTime()) ||
    isNaN(dueDateObj.getTime())
  ) {
    return false;
  }

  const tz = timeZone ?? task.timeZone;
  const targetKey = getLocalDateKey(targetDateObj, tz);
  const startKey = getLocalDateKey(startDateObj, tz);
  const dueKey = getLocalDateKey(dueDateObj, tz);

  return startKey <= targetKey && targetKey <= dueKey;
}

/**
 * Returns true if an active task has a dueDate matching referenceDate's calendar day,
 * or spans across referenceDate.
 */
export function isDueToday(
  task: TaskEntity,
  referenceDate: Date = new Date(),
  timeZone?: string
): boolean {
  if (task.deletedAt != null) return false;
  if (isTaskActiveForDate(task, referenceDate, timeZone)) {
    return true;
  }
  if (!task.dueDate) return false;
  const taskDate = new Date(task.dueDate);
  if (isNaN(taskDate.getTime())) return false;
  const targetTz = timeZone ?? task.timeZone;
  return getLocalDateKey(taskDate, targetTz) === getLocalDateKey(referenceDate, targetTz);
}

/**
 * Returns true if an active task has a dueDate matching the day after referenceDate,
 * or spans across that day.
 */
export function isDueTomorrow(
  task: TaskEntity,
  referenceDate: Date = new Date(),
  timeZone?: string
): boolean {
  if (task.deletedAt != null) return false;
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isTaskActiveForDate(task, tomorrow, timeZone)) {
    return true;
  }
  if (!task.dueDate) return false;
  const taskDate = new Date(task.dueDate);
  if (isNaN(taskDate.getTime())) return false;
  const targetTz = timeZone ?? task.timeZone;

  return getLocalDateKey(taskDate, targetTz) === getLocalDateKey(tomorrow, targetTz);
}

/**
 * Filters and returns active tasks due Today (or spanning across today), sorted by completion status, priority, and due time.
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
 * Updates the subtask items tree of a task with atomic LWW sync mutation.
 */
export async function updateTaskSubtasks(
  store: AtomicTaskStore,
  taskId: string,
  itemsTree: SubTaskItem[],
  deps?: Partial<TaskServiceDeps>
): Promise<TaskEntity> {
  const task = await store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  const now = deps?.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const newId = deps?.newId ?? (() => crypto.randomUUID());
  const mutationId = newId();

  const nextLocalStatus = task.localStatus === 'CREATED' ? 'CREATED' : 'UPDATED';
  const updatedTask: TaskEntity = {
    ...task,
    items: itemsTree,
    version: task.version + 1,
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
    payload: {
      items: itemsTree,
      updatedAt: timestamp
    },
    fieldTimestamps: {
      items: timestamp,
      updatedAt: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
}

/**
 * Promotes a subtask to an independent root task in the same list.
 */
export async function promoteSubtaskToIndependentTask(
  store: AtomicTaskStore,
  parentTaskId: string,
  subtaskId: string,
  deps: Omit<TaskServiceDeps, 'store'> & { store?: AtomicTaskStore }
): Promise<{
  updatedParent: TaskEntity;
  createdTask: TaskEntity;
  parentTask: TaskEntity;
  newIndependentTask: TaskEntity;
}> {
  const parentTask = await store.getTask(parentTaskId);
  if (!parentTask) {
    throw new TaskNotFoundError(parentTaskId);
  }

  const { updatedTree, extractedSubtask } = promoteSubtaskToTask(
    parentTask.items ?? [],
    subtaskId
  );
  if (!extractedSubtask) {
    throw new TaskValidationError(`زیرتسک با شناسه ${subtaskId} یافت نشد`);
  }

  const updatedParent = await updateTaskSubtasks(store, parentTaskId, updatedTree, deps);

  const fullDeps: TaskServiceDeps = {
    ...deps,
    store
  };

  const createdTask = await createTask(
    {
      title: extractedSubtask.title,
      priority: parentTask.priority,
      tags: parentTask.tags ? [...parentTask.tags] : [],
      timeZone: parentTask.timeZone,
      items: extractedSubtask.children ?? []
    },
    fullDeps
  );

  return {
    updatedParent,
    createdTask,
    parentTask: updatedParent,
    newIndependentTask: createdTask
  };
}

export interface UpdateTaskDetailsInput {
  title?: string | undefined;
  desc?: string | null | undefined;
  description?: string | null | undefined;
  content?: string | null | undefined;
  priority?: TaskPriority | undefined;
  startDate?: string | null | undefined;
  dueDate?: string | null | undefined;
  duration?: number | null | undefined;
  isAllDay?: boolean | undefined;
  repeatFlag?: string | null | undefined;
  reminders?: string[] | undefined;
  tags?: string[] | undefined;
  items?: SubTaskItem[] | undefined;
}

/**
 * Atomically updates task details (title, description, priority, dates, tags, etc.)
 * with field-level LWW conflict resolution.
 */
export async function updateTaskDetails(
  store: AtomicTaskStore,
  taskId: string,
  updates: UpdateTaskDetailsInput,
  deps?: Partial<TaskServiceDeps>
): Promise<TaskEntity> {
  const task = await store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  if (updates.title !== undefined && updates.title.trim().length === 0) {
    throw new TaskValidationError('عنوان task نمی‌تواند خالی باشد');
  }

  const effectiveStartDate =
    updates.startDate !== undefined ? updates.startDate : task.startDate;
  const effectiveDueDate =
    updates.dueDate !== undefined ? updates.dueDate : task.dueDate;

  if (
    effectiveStartDate &&
    effectiveDueDate &&
    new Date(effectiveStartDate).getTime() > new Date(effectiveDueDate).getTime()
  ) {
    throw new TaskValidationError('تاریخ سررسید نمی‌تواند قبل از تاریخ شروع باشد');
  }

  const now = deps?.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const newId = deps?.newId ?? (() => crypto.randomUUID());
  const mutationId = newId();

  const nextLocalStatus = task.localStatus === 'CREATED' ? 'CREATED' : 'UPDATED';

  const descVal = updates.desc !== undefined ? updates.desc : updates.description;

  const updatedTask: TaskEntity = {
    ...task,
    ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    ...(descVal !== undefined ? { desc: descVal ?? undefined, content: descVal ?? undefined } : {}),
    ...(updates.content !== undefined ? { content: updates.content ?? undefined, desc: updates.content ?? undefined } : {}),
    ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
    ...(updates.startDate !== undefined ? { startDate: updates.startDate } : {}),
    ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate } : {}),
    ...(updates.duration !== undefined ? { duration: updates.duration } : {}),
    ...(updates.isAllDay !== undefined
      ? { isAllDay: updates.isAllDay, allDay: updates.isAllDay }
      : {}),
    ...(updates.repeatFlag !== undefined ? { repeatFlag: updates.repeatFlag } : {}),
    ...(updates.reminders !== undefined ? { reminders: updates.reminders } : {}),
    ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
    ...(updates.items !== undefined ? { items: updates.items } : {}),
    version: task.version + 1,
    updatedAt: timestamp,
    localStatus: nextLocalStatus
  };

  const payload: Partial<TaskEntity> = {
    updatedAt: timestamp
  };
  const fieldTimestamps: Record<string, string> = {
    updatedAt: timestamp
  };

  const keys: (keyof UpdateTaskDetailsInput)[] = [
    'title',
    'desc',
    'description',
    'content',
    'priority',
    'startDate',
    'dueDate',
    'duration',
    'isAllDay',
    'repeatFlag',
    'reminders',
    'tags',
    'items'
  ];

  for (const k of keys) {
    if (updates[k] !== undefined) {
      if (k === 'description') {
        payload.desc = descVal ?? undefined;
        payload.content = descVal ?? undefined;
        fieldTimestamps.desc = timestamp;
        fieldTimestamps.content = timestamp;
      } else {
        (payload as Record<string, unknown>)[k] = (
          updatedTask as unknown as Record<string, unknown>
        )[k];
        fieldTimestamps[k] = timestamp;
      }
    }
  }

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: mutationId,
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

  await store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
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

/**
 * Reorders a task using fractional indexing (LexoRank) relative to its neighbors,
 * updating position and registering an atomic LWW mutation with fieldTimestamps.position.
 */
export async function reorderTask(
  store: AtomicTaskStore,
  taskId: string,
  prevTaskId?: string | null,
  nextTaskId?: string | null,
  deps?: Partial<TaskServiceDeps>
): Promise<TaskEntity> {
  const task = await store.getTask(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  let prevRank: string | null = null;
  if (prevTaskId) {
    const prevTask = await store.getTask(prevTaskId);
    prevRank = prevTask?.position ?? null;
  }

  let nextRank: string | null = null;
  if (nextTaskId) {
    const nextTask = await store.getTask(nextTaskId);
    nextRank = nextTask?.position ?? null;
  }

  const newPosition = generateLexoRank(prevRank, nextRank);
  const now = deps?.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const newId = deps?.newId ?? (() => crypto.randomUUID());
  const mutationId = newId();
  const nextLocalStatus = task.localStatus === 'CREATED' ? 'CREATED' : 'UPDATED';

  const updatedTask: TaskEntity = {
    ...task,
    position: newPosition,
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
    payload: {
      position: newPosition
    },
    fieldTimestamps: {
      position: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
}
