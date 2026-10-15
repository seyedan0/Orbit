import type {
  FilterRule,
  SmartFilterEntity,
  SyncQueueEntry
} from '@orbit/shared-types';
import type { AtomicFilterStore } from '@orbit/sync-engine';

// ---- System Filter Presets ----

export const SYSTEM_OVERDUE_FILTER_ID = 'system-overdue';
export const SYSTEM_HIGH_PRIORITY_FILTER_ID = 'system-high-priority';
export const SYSTEM_NO_DATE_FILTER_ID = 'system-no-date';
export const SYSTEM_TODAY_FILTER_ID = 'system-today';
export const SYSTEM_THIS_WEEK_FILTER_ID = 'system-this-week';

export const SYSTEM_FILTER_PRESET_IDS = new Set<string>([
  SYSTEM_OVERDUE_FILTER_ID,
  SYSTEM_HIGH_PRIORITY_FILTER_ID,
  SYSTEM_NO_DATE_FILTER_ID,
  SYSTEM_TODAY_FILTER_ID,
  SYSTEM_THIS_WEEK_FILTER_ID
]);

export const SYSTEM_FILTER_PRESETS: readonly SmartFilterEntity[] = [
  {
    id: SYSTEM_OVERDUE_FILTER_ID,
    userId: 'system',
    name: 'سررسید گذشته',
    color: '#ef4444',
    icon: 'alert-triangle',
    rule: {
      operator: 'AND',
      rules: [
        { field: 'isCompleted', operator: 'eq', value: false },
        { field: 'dueDate', operator: 'within', value: 'overdue' }
      ]
    },
    order: 0,
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null
  },
  {
    id: SYSTEM_HIGH_PRIORITY_FILTER_ID,
    userId: 'system',
    name: 'اولویت بالا',
    color: '#f59e0b',
    icon: 'flag',
    rule: {
      operator: 'AND',
      rules: [
        { field: 'isCompleted', operator: 'eq', value: false },
        { field: 'priority', operator: 'gte', value: 3 }
      ]
    },
    order: 1,
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null
  },
  {
    id: SYSTEM_NO_DATE_FILTER_ID,
    userId: 'system',
    name: 'بدون تاریخ',
    color: '#64748b',
    icon: 'calendar-off',
    rule: {
      operator: 'AND',
      rules: [
        { field: 'isCompleted', operator: 'eq', value: false },
        { field: 'dueDate', operator: 'within', value: 'no_date' }
      ]
    },
    order: 2,
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null
  },
  {
    id: SYSTEM_TODAY_FILTER_ID,
    userId: 'system',
    name: 'امروز',
    color: '#3b82f6',
    icon: 'calendar',
    rule: {
      operator: 'AND',
      rules: [
        { field: 'dueDate', operator: 'within', value: 'today' }
      ]
    },
    order: 3,
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null
  },
  {
    id: SYSTEM_THIS_WEEK_FILTER_ID,
    userId: 'system',
    name: 'هفته جاری',
    color: '#8b5cf6',
    icon: 'calendar-range',
    rule: {
      operator: 'AND',
      rules: [
        { field: 'dueDate', operator: 'within', value: 'this_week' }
      ]
    },
    order: 4,
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null
  }
];

export function isSystemFilterId(id: string): boolean {
  return SYSTEM_FILTER_PRESET_IDS.has(id);
}

export function getSystemFilterById(id: string): SmartFilterEntity | undefined {
  const preset = SYSTEM_FILTER_PRESETS.find((p) => p.id === id);
  return preset ? structuredClone(preset) : undefined;
}

// ---- Errors ----

export class FilterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FilterValidationError';
  }
}

export class FilterNotFoundError extends Error {
  constructor(id: string) {
    super(`فیلتر هوشمند با شناسه ${id} یافت نشد`);
    this.name = 'FilterNotFoundError';
  }
}

export class SystemFilterModificationError extends Error {
  constructor(id: string) {
    super(`فیلترهای سیستمی پیش‌فرض قابل تغییر یا حذف نیستند (${id})`);
    this.name = 'SystemFilterModificationError';
  }
}

// ---- Service Types ----

export interface CreateSmartFilterInput {
  name: string;
  rule: FilterRule;
  color?: string | undefined;
  icon?: string | null | undefined;
  order?: number | undefined;
}

export interface UpdateSmartFilterInput {
  name?: string | undefined;
  rule?: FilterRule | undefined;
  color?: string | undefined;
  icon?: string | null | undefined;
  order?: number | undefined;
}

export interface FilterServiceDeps {
  store: AtomicFilterStore;
  userId: string;
  newId?: () => string;
  now?: () => Date;
}

// ---- CRUD Operations ----

/**
 * Creates a new user SmartFilterEntity with atomic CREATE mutation and LWW timestamps.
 */
export async function createSmartFilter(
  input: CreateSmartFilterInput,
  deps: FilterServiceDeps
): Promise<SmartFilterEntity> {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new FilterValidationError('نام فیلتر هوشمند نمی‌تواند خالی باشد');
  }

  if (!input.rule || typeof input.rule !== 'object') {
    throw new FilterValidationError('قانون فیلتر معتبر نیست');
  }

  const newId = deps.newId ?? (() => crypto.randomUUID());
  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const filterId = newId();
  const mutationId = newId();

  const filter: SmartFilterEntity = {
    id: filterId,
    userId: deps.userId,
    name,
    color: input.color?.trim() || '#6366f1',
    icon: input.icon ?? null,
    rule: input.rule,
    order: input.order ?? 10,
    version: 0,
    localStatus: 'CREATED',
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: filterId,
    entityType: 'SMART_FILTER',
    entityId: filterId,
    operation: 'CREATE',
    baseVersion: 0,
    payloadType: 'FULL',
    payload: filter,
    fieldTimestamps: {
      name: timestamp,
      color: timestamp,
      icon: timestamp,
      rule: timestamp,
      order: timestamp
    },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveSmartFilterWithMutation(filter, mutation);
  return filter;
}

/**
 * Updates an existing user SmartFilterEntity with atomic PARTIAL mutation and LWW timestamps.
 */
export async function updateSmartFilter(
  filterId: string,
  updates: UpdateSmartFilterInput,
  deps: FilterServiceDeps
): Promise<SmartFilterEntity> {
  if (isSystemFilterId(filterId)) {
    throw new SystemFilterModificationError(filterId);
  }

  const existing = await deps.store.getSmartFilter(filterId);
  if (!existing || existing.deletedAt != null) {
    throw new FilterNotFoundError(filterId);
  }

  if (updates.name !== undefined && updates.name.trim().length === 0) {
    throw new FilterValidationError('نام فیلتر هوشمند نمی‌تواند خالی باشد');
  }

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const timestamp = now().toISOString();
  const mutationId = newId();

  const fieldTimestamps: Record<string, string> = {};
  const partialPayload: Partial<SmartFilterEntity> = {};

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
  if (updates.rule !== undefined && JSON.stringify(updates.rule) !== JSON.stringify(existing.rule)) {
    partialPayload.rule = updates.rule;
    fieldTimestamps.rule = timestamp;
  }
  if (updates.order !== undefined && updates.order !== existing.order) {
    partialPayload.order = updates.order;
    fieldTimestamps.order = timestamp;
  }

  if (Object.keys(partialPayload).length === 0) {
    return existing;
  }

  const updatedFilter: SmartFilterEntity = {
    ...existing,
    ...partialPayload,
    version: existing.version + 1,
    localStatus: 'UPDATED',
    updatedAt: timestamp
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: `${filterId}-${updatedFilter.version}`,
    entityType: 'SMART_FILTER',
    entityId: filterId,
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

  await deps.store.saveSmartFilterWithMutation(updatedFilter, mutation);
  return updatedFilter;
}

/**
 * Soft deletes a user SmartFilterEntity with an atomic DELETE mutation.
 */
export async function deleteSmartFilter(
  filterId: string,
  deps: FilterServiceDeps
): Promise<SmartFilterEntity> {
  if (isSystemFilterId(filterId)) {
    throw new SystemFilterModificationError(filterId);
  }

  const existing = await deps.store.getSmartFilter(filterId);
  if (!existing || existing.deletedAt != null) {
    throw new FilterNotFoundError(filterId);
  }

  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const timestamp = now().toISOString();
  const mutationId = newId();

  const deletedFilter: SmartFilterEntity = {
    ...existing,
    deletedAt: timestamp,
    version: existing.version + 1,
    localStatus: 'DELETED',
    updatedAt: timestamp
  };

  const mutation: SyncQueueEntry = {
    id: mutationId,
    idempotencyKey: `${filterId}-delete-${deletedFilter.version}`,
    entityType: 'SMART_FILTER',
    entityId: filterId,
    operation: 'DELETE',
    baseVersion: existing.version,
    payloadType: 'PARTIAL',
    payload: { deletedAt: timestamp },
    fieldTimestamps: { deletedAt: timestamp },
    createdAt: timestamp,
    status: 'PENDING',
    attemptCount: 0,
    nextAttemptAt: timestamp
  };

  await deps.store.saveSmartFilterWithMutation(deletedFilter, mutation);
  return deletedFilter;
}

/**
 * Gets a SmartFilterEntity by id (checking system presets first, then local store).
 */
export async function getSmartFilter(
  filterId: string,
  deps: FilterServiceDeps
): Promise<SmartFilterEntity | undefined> {
  if (isSystemFilterId(filterId)) {
    return getSystemFilterById(filterId);
  }
  const filter = await deps.store.getSmartFilter(filterId);
  if (!filter || filter.deletedAt != null) {
    return undefined;
  }
  return filter;
}

/**
 * Lists user-defined smart filters from local store.
 */
export async function listUserSmartFilters(
  deps: FilterServiceDeps,
  options?: { includeDeleted?: boolean }
): Promise<SmartFilterEntity[]> {
  const all = await deps.store.listSmartFilters(options);
  return all
    .filter((f) => f.userId === deps.userId || deps.userId === 'all')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

/**
 * Lists all active smart filters: system presets followed by user-defined filters.
 */
export async function listAllSmartFilters(
  deps: FilterServiceDeps
): Promise<SmartFilterEntity[]> {
  const userFilters = await listUserSmartFilters(deps);
  return [...SYSTEM_FILTER_PRESETS.map((p) => structuredClone(p)), ...userFilters];
}
