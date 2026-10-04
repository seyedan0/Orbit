import type { TaskEntity } from './task.js';

export type EntityType = 'TASK';
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
  payload: Partial<TaskEntity>;
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
