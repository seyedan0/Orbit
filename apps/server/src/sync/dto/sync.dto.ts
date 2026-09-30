import type { MutationPayload, TaskEntity } from '@orbit/shared-types';

export type PushResultStatus =
  | 'APPLIED'
  | 'ALREADY_APPLIED'
  | 'CONFLICT_MERGED'
  | 'REJECTED'
  | 'RETRYABLE_ERROR';

export interface PushResult {
  mutationId: string;
  status: PushResultStatus;
}

export interface PushRequestBody {
  mutations: MutationPayload[];
}

export interface PushResponseBody {
  results: PushResult[];
}

export interface PullResponseBody {
  changes: TaskEntity[];
  nextCursor: string;
  hasMore: boolean;
}
