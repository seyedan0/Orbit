import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { MutationPayload } from '@orbit/shared-types';
import {
  SYNC_REPOSITORY,
  type SyncRepository
} from './interfaces/sync-repository.interface.js';
import type {
  PullResponseBody,
  PushRequestBody,
  PushResponseBody,
  PushResult
} from './dto/sync.dto.js';

@Injectable()
export class SyncService {
  constructor(
    @Inject(SYNC_REPOSITORY)
    private readonly syncRepository: SyncRepository
  ) {}

  private validateMutation(mutation: unknown): mutation is MutationPayload {
    if (!mutation || typeof mutation !== 'object') {
      return false;
    }

    const m = mutation as Record<string, unknown>;

    if (typeof m.id !== 'string' || m.id.trim().length === 0) {
      return false;
    }
    if (typeof m.idempotencyKey !== 'string' || m.idempotencyKey.trim().length === 0) {
      return false;
    }
    if (m.entityType !== 'TASK') {
      return false;
    }
    if (typeof m.entityId !== 'string' || m.entityId.trim().length === 0) {
      return false;
    }
    if (
      typeof m.operation !== 'string' ||
      !['CREATE', 'UPDATE', 'DELETE'].includes(m.operation)
    ) {
      return false;
    }
    if (!m.payload || typeof m.payload !== 'object') {
      return false;
    }
    if (typeof m.createdAt !== 'string' || Number.isNaN(Date.parse(m.createdAt))) {
      return false;
    }

    return true;
  }

  async push(userId: string, body: PushRequestBody): Promise<PushResponseBody> {
    if (!body || !Array.isArray(body.mutations)) {
      throw new BadRequestException('Request body must contain mutations array');
    }

    const results: PushResult[] = [];

    for (const rawMutation of body.mutations) {
      if (!this.validateMutation(rawMutation)) {
        const id =
          rawMutation && typeof rawMutation === 'object' && 'id' in rawMutation
            ? String((rawMutation as { id: unknown }).id)
            : 'unknown';
        results.push({
          mutationId: id,
          status: 'REJECTED'
        });
        continue;
      }

      const mutation = rawMutation;

      const existing = await this.syncRepository.getMutationByIdempotencyKey(
        userId,
        mutation.idempotencyKey
      );

      if (existing) {
        results.push({
          mutationId: mutation.id,
          status: 'ALREADY_APPLIED'
        });
        continue;
      }

      await this.syncRepository.applyTaskMutation(userId, mutation);
      await this.syncRepository.saveAppliedMutation(userId, mutation);

      results.push({
        mutationId: mutation.id,
        status: 'APPLIED'
      });
    }

    return { results };
  }

  async pull(
    userId: string,
    cursor?: string,
    limitStr?: string
  ): Promise<PullResponseBody> {
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const safeLimit = Number.isNaN(limit) ? 50 : limit;

    return this.syncRepository.getChanges(userId, cursor, safeLimit);
  }
}
