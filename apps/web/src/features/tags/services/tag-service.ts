import type {
  SyncQueueEntry,
  TagEntity,
  TagGroupEntity,
  TaskEntity
} from '@orbit/shared-types';
import type { AtomicTagStore, AtomicTaskStore } from '@orbit/sync-engine';
import { TaskNotFoundError } from '../../tasks/services/task-service';

export const PRESET_TAG_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b'  // Slate
] as const;

export const DEFAULT_TAG_COLOR = '#6366f1';

export class TagValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TagValidationError';
  }
}

export class TagNotFoundError extends Error {
  constructor(id: string) {
    super(`تگ با شناسه ${id} یافت نشد`);
    this.name = 'TagNotFoundError';
  }
}

export class TagGroupNotFoundError extends Error {
  constructor(id: string) {
    super(`گروه تگ با شناسه ${id} یافت نشد`);
    this.name = 'TagGroupNotFoundError';
  }
}

export interface CreateTagInput {
  name: string;
  color?: string | undefined;
  icon?: string | null | undefined;
  groupId?: string | null | undefined;
  order?: number | undefined;
}

export interface UpdateTagInput {
  name?: string | undefined;
  color?: string | undefined;
  icon?: string | null | undefined;
  groupId?: string | null | undefined;
  order?: number | undefined;
}

export interface CreateTagGroupInput {
  name: string;
  color?: string | undefined;
  order?: number | undefined;
}

export interface UpdateTagGroupInput {
  name?: string | undefined;
  color?: string | undefined;
  order?: number | undefined;
}

export interface TagServiceDeps {
  store: AtomicTagStore;
  userId: string;
  newId?: () => string;
  now?: () => Date;
}

export interface TaskTagDeps {
  store: AtomicTaskStore;
  userId: string;
  newId?: () => string;
  now?: () => Date;
}

/**
 * Creates a new Tag entity atomically with its CREATE mutation and LWW fieldTimestamps.
 */
export async function createTag(
  input: CreateTagInput,
  deps: TagServiceDeps
): Promise<TagEntity> {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new TagValidationError('نام برچسب نمی‌تواند خالی باشد');
  }

  const newId = deps.newId ?? (() => crypto.randomUUID());
  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const tagId = newId();
  const mutationId = newId();

  const color = input.color?.trim() || DEFAULT_TAG_COLOR;

  const tag: TagEntity = {
    id: tagId,
    userId: deps.userId,
    name,
    color,
    icon: input.icon ?? null,
    groupId: input.groupId ?? null,
    order: input.order ?? 0,
    version: 0,
    localStatus: 'CREATED',
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: tagId,
    entityType: 'TAG',
    entityId: tagId,
    operation: 'CREATE',
    baseVersion: 0,
    payloadType: 'FULL',
    payload: tag,
    fieldTimestamps: {
      name: timestamp,
      color: timestamp,
      icon: timestamp,
      groupId: timestamp,
      order: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTagWithMutation(tag, mutation);
  return tag;
}

/**
 * Updates an existing Tag entity with atomic PARTIAL mutation and LWW timestamps.
 */
export async function updateTag(
  tagId: string,
  updates: UpdateTagInput,
  deps: TagServiceDeps
): Promise<TagEntity> {
  const existing = await deps.store.getTag(tagId);
  if (!existing || existing.deletedAt != null) {
    throw new TagNotFoundError(tagId);
  }

  if (updates.name !== undefined && updates.name.trim().length === 0) {
    throw new TagValidationError('نام برچسب نمی‌تواند خالی باشد');
  }

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const timestamp = now().toISOString();
  const mutationId = newId();

  const fieldTimestamps: Record<string, string> = {};
  const partialPayload: Partial<TagEntity> = {};

  if (updates.name !== undefined && updates.name.trim() !== existing.name) {
    partialPayload.name = updates.name.trim();
    fieldTimestamps.name = timestamp;
  }
  if (updates.color !== undefined && updates.color !== existing.color) {
    partialPayload.color = updates.color.trim();
    fieldTimestamps.color = timestamp;
  }
  if (updates.icon !== undefined && updates.icon !== existing.icon) {
    partialPayload.icon = updates.icon;
    fieldTimestamps.icon = timestamp;
  }
  if (updates.groupId !== undefined && updates.groupId !== existing.groupId) {
    partialPayload.groupId = updates.groupId;
    fieldTimestamps.groupId = timestamp;
  }
  if (updates.order !== undefined && updates.order !== existing.order) {
    partialPayload.order = updates.order;
    fieldTimestamps.order = timestamp;
  }

  // If no fields changed, return existing
  if (Object.keys(partialPayload).length === 0) {
    return existing;
  }

  const updatedTag: TagEntity = {
    ...existing,
    ...partialPayload,
    version: existing.version + 1,
    localStatus: 'UPDATED',
    updatedAt: timestamp
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: `${tagId}-${updatedTag.version}`,
    entityType: 'TAG',
    entityId: tagId,
    operation: 'UPDATE',
    baseVersion: existing.version,
    payloadType: 'PARTIAL',
    payload: partialPayload,
    fieldTimestamps,
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTagWithMutation(updatedTag, mutation);
  return updatedTag;
}

/**
 * Soft deletes a Tag entity with an atomic DELETE mutation.
 */
export async function deleteTag(
  tagId: string,
  deps: TagServiceDeps
): Promise<TagEntity> {
  const existing = await deps.store.getTag(tagId);
  if (!existing || existing.deletedAt != null) {
    throw new TagNotFoundError(tagId);
  }

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const timestamp = now().toISOString();
  const mutationId = newId();

  const deletedTag: TagEntity = {
    ...existing,
    deletedAt: timestamp,
    version: existing.version + 1,
    localStatus: 'DELETED',
    updatedAt: timestamp
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: `${tagId}-delete-${deletedTag.version}`,
    entityType: 'TAG',
    entityId: tagId,
    operation: 'DELETE',
    baseVersion: existing.version,
    payloadType: 'PARTIAL',
    payload: { deletedAt: timestamp },
    fieldTimestamps: {
      deletedAt: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTagWithMutation(deletedTag, mutation);
  return deletedTag;
}

/**
 * Lists tags with optional inclusion of deleted tags.
 */
export async function listTags(
  deps: Pick<TagServiceDeps, 'store'>,
  options?: { includeDeleted?: boolean }
): Promise<TagEntity[]> {
  return deps.store.listTags(options);
}

/**
 * Retrieves a single tag by ID.
 */
export async function getTag(
  tagId: string,
  deps: Pick<TagServiceDeps, 'store'>
): Promise<TagEntity | undefined> {
  return deps.store.getTag(tagId);
}

// ---- Tag Groups ----

/**
 * Creates a new TagGroup entity atomically.
 */
export async function createTagGroup(
  input: CreateTagGroupInput,
  deps: TagServiceDeps
): Promise<TagGroupEntity> {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new TagValidationError('نام گروه برچسب نمی‌تواند خالی باشد');
  }

  const newId = deps.newId ?? (() => crypto.randomUUID());
  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const groupId = newId();
  const mutationId = newId();

  const group: TagGroupEntity = {
    id: groupId,
    userId: deps.userId,
    name,
    color: input.color?.trim() || undefined,
    order: input.order ?? 0,
    version: 0,
    localStatus: 'CREATED',
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: groupId,
    entityType: 'TAG_GROUP',
    entityId: groupId,
    operation: 'CREATE',
    baseVersion: 0,
    payloadType: 'FULL',
    payload: group,
    fieldTimestamps: {
      name: timestamp,
      ...(group.color ? { color: timestamp } : {}),
      order: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTagGroupWithMutation(group, mutation);
  return group;
}

/**
 * Updates a TagGroup entity atomically.
 */
export async function updateTagGroup(
  groupId: string,
  updates: UpdateTagGroupInput,
  deps: TagServiceDeps
): Promise<TagGroupEntity> {
  const existing = await deps.store.getTagGroup(groupId);
  if (!existing || existing.deletedAt != null) {
    throw new TagGroupNotFoundError(groupId);
  }

  if (updates.name !== undefined && updates.name.trim().length === 0) {
    throw new TagValidationError('نام گروه برچسب نمی‌تواند خالی باشد');
  }

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const timestamp = now().toISOString();
  const mutationId = newId();

  const fieldTimestamps: Record<string, string> = {};
  const partialPayload: Partial<TagGroupEntity> = {};

  if (updates.name !== undefined && updates.name.trim() !== existing.name) {
    partialPayload.name = updates.name.trim();
    fieldTimestamps.name = timestamp;
  }
  if (updates.color !== undefined && updates.color !== existing.color) {
    partialPayload.color = updates.color.trim();
    fieldTimestamps.color = timestamp;
  }
  if (updates.order !== undefined && updates.order !== existing.order) {
    partialPayload.order = updates.order;
    fieldTimestamps.order = timestamp;
  }

  if (Object.keys(partialPayload).length === 0) {
    return existing;
  }

  const updatedGroup: TagGroupEntity = {
    ...existing,
    ...partialPayload,
    version: existing.version + 1,
    localStatus: 'UPDATED',
    updatedAt: timestamp
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: `${groupId}-${updatedGroup.version}`,
    entityType: 'TAG_GROUP',
    entityId: groupId,
    operation: 'UPDATE',
    baseVersion: existing.version,
    payloadType: 'PARTIAL',
    payload: partialPayload,
    fieldTimestamps,
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTagGroupWithMutation(updatedGroup, mutation);
  return updatedGroup;
}

/**
 * Soft deletes a TagGroup entity atomically.
 */
export async function deleteTagGroup(
  groupId: string,
  deps: TagServiceDeps
): Promise<TagGroupEntity> {
  const existing = await deps.store.getTagGroup(groupId);
  if (!existing || existing.deletedAt != null) {
    throw new TagGroupNotFoundError(groupId);
  }

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const timestamp = now().toISOString();
  const mutationId = newId();

  const deletedGroup: TagGroupEntity = {
    ...existing,
    deletedAt: timestamp,
    version: existing.version + 1,
    localStatus: 'DELETED',
    updatedAt: timestamp
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: `${groupId}-delete-${deletedGroup.version}`,
    entityType: 'TAG_GROUP',
    entityId: groupId,
    operation: 'DELETE',
    baseVersion: existing.version,
    payloadType: 'PARTIAL',
    payload: { deletedAt: timestamp },
    fieldTimestamps: {
      deletedAt: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTagGroupWithMutation(deletedGroup, mutation);
  return deletedGroup;
}

/**
 * Lists tag groups.
 */
export async function listTagGroups(
  deps: Pick<TagServiceDeps, 'store'>,
  options?: { includeDeleted?: boolean }
): Promise<TagGroupEntity[]> {
  return deps.store.listTagGroups(options);
}

// ---- Task Tag Attachment & Detachment (LWW) ----

/**
 * Attaches a tag to a task atomically using field-level LWW conflict resolution.
 * Idempotent: If tag is already present, returns the task without modifying storage.
 */
export async function attachTagToTask(
  taskId: string,
  tagId: string,
  deps: TaskTagDeps
): Promise<TaskEntity> {
  const task = await deps.store.getTask(taskId);
  if (!task || task.deletedAt != null) {
    throw new TaskNotFoundError(taskId);
  }

  const currentTags = task.tags ?? [];
  if (currentTags.includes(tagId)) {
    return task;
  }

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const timestamp = now().toISOString();
  const mutationId = newId();

  const newTags = [...currentTags, tagId];

  const updatedTask: TaskEntity = {
    ...task,
    tags: newTags,
    version: task.version + 1,
    localStatus: 'UPDATED',
    updatedAt: timestamp
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: `${taskId}-tags-${updatedTask.version}`,
    entityType: 'TASK',
    entityId: taskId,
    operation: 'UPDATE',
    baseVersion: task.version,
    payloadType: 'PARTIAL',
    payload: { tags: newTags },
    fieldTimestamps: {
      tags: timestamp
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
 * Detaches a tag from a task atomically using field-level LWW conflict resolution.
 * Idempotent: If tag is not present, returns the task without modifying storage.
 */
export async function detachTagFromTask(
  taskId: string,
  tagId: string,
  deps: TaskTagDeps
): Promise<TaskEntity> {
  const task = await deps.store.getTask(taskId);
  if (!task || task.deletedAt != null) {
    throw new TaskNotFoundError(taskId);
  }

  const currentTags = task.tags ?? [];
  if (!currentTags.includes(tagId)) {
    return task;
  }

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const timestamp = now().toISOString();
  const mutationId = newId();

  const newTags = currentTags.filter((t) => t !== tagId);

  const updatedTask: TaskEntity = {
    ...task,
    tags: newTags,
    version: task.version + 1,
    localStatus: 'UPDATED',
    updatedAt: timestamp
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: `${taskId}-tags-${updatedTask.version}`,
    entityType: 'TASK',
    entityId: taskId,
    operation: 'UPDATE',
    baseVersion: task.version,
    payloadType: 'PARTIAL',
    payload: { tags: newTags },
    fieldTimestamps: {
      tags: timestamp
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
 * Sets the full list of tags on a task atomically using field-level LWW conflict resolution.
 * Automatically deduplicates tag IDs.
 */
export async function setTaskTags(
  taskId: string,
  tagIds: string[],
  deps: TaskTagDeps
): Promise<TaskEntity> {
  const task = await deps.store.getTask(taskId);
  if (!task || task.deletedAt != null) {
    throw new TaskNotFoundError(taskId);
  }

  const deduplicatedTags = Array.from(new Set(tagIds));
  const currentTags = task.tags ?? [];

  // If already identical in size and content, return early
  if (
    currentTags.length === deduplicatedTags.length &&
    currentTags.every((t, i) => t === deduplicatedTags[i])
  ) {
    return task;
  }

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const timestamp = now().toISOString();
  const mutationId = newId();

  const updatedTask: TaskEntity = {
    ...task,
    tags: deduplicatedTags,
    version: task.version + 1,
    localStatus: 'UPDATED',
    updatedAt: timestamp
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: `${taskId}-tags-${updatedTask.version}`,
    entityType: 'TASK',
    entityId: taskId,
    operation: 'UPDATE',
    baseVersion: task.version,
    payloadType: 'PARTIAL',
    payload: { tags: deduplicatedTags },
    fieldTimestamps: {
      tags: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveTaskWithMutation(updatedTask, mutation);
  return updatedTask;
}
