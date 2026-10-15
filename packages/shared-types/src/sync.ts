import type { TaskEntity } from './task.js';
import type { TagEntity, TagGroupEntity } from './tag.js';
import type { SmartFilterEntity } from './filter.js';
import type { FocusSessionEntity } from './focus.js';

export type EntityType = 'TASK' | 'TAG' | 'TAG_GROUP' | 'SMART_FILTER' | 'FOCUS_SESSION';
export type MutationOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type MutationPayloadType = 'FULL' | 'PARTIAL';

export interface FieldTimestampMap {
  [field: string]: string;
}

export interface MutationPayload {
  id: string;
  idempotencyKey: string;
  entityType: EntityType;
  entityId: string;
  operation: MutationOperation;
  baseVersion: number;
  payloadType: MutationPayloadType;
  payload:
    | Partial<TaskEntity>
    | Partial<TagEntity>
    | Partial<TagGroupEntity>
    | Partial<SmartFilterEntity>
    | Partial<FocusSessionEntity>;
  fieldTimestamps: FieldTimestampMap;
  createdAt: string;
}

export type QueueStatus = 'PENDING' | 'IN_FLIGHT' | 'SUCCEEDED' | 'FAILED';

export interface SyncQueueEntry extends MutationPayload {
  status: QueueStatus;
  attemptCount: number;
  nextAttemptAt: string;
  lastError?: string | undefined;
  inFlightSince?: string | undefined;
}

export interface PullResponse {
  changes: TaskEntity[];
  nextCursor: string;
  hasMore: boolean;
}
