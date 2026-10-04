import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type { MutationPayload, TaskEntity } from '@orbit/shared-types';
import type {
  ApplyMutationResult,
  CleanTombstonesOptions,
  CleanTombstonesResult,
  PullResult,
  SyncRepository
} from '../interfaces/sync-repository.interface.js';
import { mergeTaskFieldsWithLww } from '../utils/conflict-resolution.util.js';
import {
  CleanedTombstoneEntity,
  SyncMutationEntity,
  TaskEntityModel
} from '../../database/entities/index.js';

function toTaskEntity(model: TaskEntityModel): TaskEntity {
  return {
    id: model.id,
    projectId: model.projectId,
    userId: model.userId,
    title: model.title,
    ...(model.content != null ? { content: model.content } : {}),
    ...(model.desc != null ? { desc: model.desc } : {}),
    kind: model.kind,
    priority: model.priority,
    isAllDay: model.isAllDay,
    ...(model.startDate != null ? { startDate: model.startDate } : {}),
    ...(model.dueDate != null ? { dueDate: model.dueDate } : {}),
    timeZone: model.timeZone,
    ...(model.repeatFlag != null ? { repeatFlag: model.repeatFlag } : {}),
    reminders: Array.isArray(model.reminders) ? model.reminders : [],
    items: Array.isArray(model.items) ? model.items : [],
    version: model.version,
    localStatus: model.localStatus,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    completedAt: model.completedAt ?? null,
    deletedAt: model.deletedAt ?? null
  };
}

function toMutationPayload(entity: SyncMutationEntity): MutationPayload {
  return {
    id: entity.id,
    idempotencyKey: entity.idempotencyKey,
    entityType: entity.entityType,
    entityId: entity.entityId,
    operation: entity.operation,
    baseVersion: entity.baseVersion,
    payloadType: entity.payloadType,
    payload: entity.payload as Partial<TaskEntity>,
    fieldTimestamps: entity.fieldTimestamps,
    createdAt: entity.createdAt
  };
}

@Injectable()
export class PostgresSyncRepository implements SyncRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(TaskEntityModel)
    private readonly taskRepo: Repository<TaskEntityModel>,
    @InjectRepository(SyncMutationEntity)
    private readonly mutationRepo: Repository<SyncMutationEntity>,
    @InjectRepository(CleanedTombstoneEntity)
    private readonly cleanedTombstoneRepo: Repository<CleanedTombstoneEntity>
  ) {}

  async getMutationByIdempotencyKey(
    userId: string,
    idempotencyKey: string
  ): Promise<MutationPayload | null> {
    const entity = await this.mutationRepo.findOne({
      where: { userId, idempotencyKey }
    });
    return entity ? toMutationPayload(entity) : null;
  }

  async saveAppliedMutation(userId: string, mutation: MutationPayload): Promise<void> {
    const entity = new SyncMutationEntity();
    entity.id = mutation.id;
    entity.userId = userId;
    entity.idempotencyKey = mutation.idempotencyKey;
    entity.entityType = mutation.entityType;
    entity.entityId = mutation.entityId;
    entity.operation = mutation.operation;
    entity.baseVersion = mutation.baseVersion ?? 0;
    entity.payloadType = mutation.payloadType ?? 'FULL';
    entity.payload = mutation.payload as Record<string, unknown>;
    entity.fieldTimestamps = mutation.fieldTimestamps ?? {};
    entity.createdAt = mutation.createdAt;

    await this.mutationRepo.save(entity);
  }

  private async applyTaskMutationInManager(
    manager: EntityManager,
    userId: string,
    mutation: MutationPayload
  ): Promise<{ task: TaskEntityModel; status: 'APPLIED' | 'CONFLICT_MERGED' }> {
    const existing = await manager.findOne(TaskEntityModel, {
      where: { id: mutation.entityId, userId }
    });

    const version = existing ? existing.version + 1 : (mutation.baseVersion || 0) + 1;

    const seqResult = await manager.query(
      "SELECT nextval('tasks_cursor_seq') AS next_cursor"
    );
    const nextCursor = String(seqResult[0]?.next_cursor ?? '1');

    const mergeResult = mergeTaskFieldsWithLww(existing, mutation, userId);
    const task = mergeResult.task;
    task.version = version;
    task.localStatus = 'SYNCED';
    task.cursor = nextCursor;

    const savedTask = await manager.save(TaskEntityModel, task);
    return {
      task: savedTask,
      status: mergeResult.status
    };
  }

  async applyTaskMutation(userId: string, mutation: MutationPayload): Promise<TaskEntity> {
    const cleaned = await this.cleanedTombstoneRepo.findOne({
      where: { userId, entityId: mutation.entityId }
    });
    if (cleaned) {
      throw new Error(
        `Task ${mutation.entityId} was permanently cleaned up and cannot be resurrected`
      );
    }

    const { task } = await this.applyTaskMutationInManager(
      this.dataSource.manager,
      userId,
      mutation
    );
    return toTaskEntity(task);
  }

  async applyMutationAtomic(
    userId: string,
    mutation: MutationPayload
  ): Promise<ApplyMutationResult> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Check idempotency
      const existing = await manager.findOne(SyncMutationEntity, {
        where: { userId, idempotencyKey: mutation.idempotencyKey }
      });
      if (existing) {
        return { status: 'ALREADY_APPLIED' };
      }

      // 2. Check if this entity is an expired / purged tombstone (Rule 6: prevent resurrection)
      const cleaned = await manager.findOne(CleanedTombstoneEntity, {
        where: { userId, entityId: mutation.entityId }
      });
      if (cleaned) {
        return {
          status: 'REJECTED',
          error: `Task ${mutation.entityId} was permanently cleaned up and cannot be resurrected`
        };
      }

      // 3. Apply task mutation with deterministic field-level conflict resolution
      const { task: savedTask, status: mutationStatus } =
        await this.applyTaskMutationInManager(manager, userId, mutation);

      // 4. Save applied mutation
      const mutationEntity = new SyncMutationEntity();
      mutationEntity.id = mutation.id;
      mutationEntity.userId = userId;
      mutationEntity.idempotencyKey = mutation.idempotencyKey;
      mutationEntity.entityType = mutation.entityType;
      mutationEntity.entityId = mutation.entityId;
      mutationEntity.operation = mutation.operation;
      mutationEntity.baseVersion = mutation.baseVersion ?? 0;
      mutationEntity.payloadType = mutation.payloadType ?? 'FULL';
      mutationEntity.payload = mutation.payload as Record<string, unknown>;
      mutationEntity.fieldTimestamps = mutation.fieldTimestamps ?? {};
      mutationEntity.createdAt = mutation.createdAt;

      try {
        await manager.save(SyncMutationEntity, mutationEntity);
      } catch (err: unknown) {
        // Handle concurrent insert duplicate key violation (code 23505)
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === '23505'
        ) {
          return { status: 'ALREADY_APPLIED' };
        }
        throw err;
      }

      return {
        status: mutationStatus,
        task: toTaskEntity(savedTask)
      };
    });
  }

  async cleanTombstones(options?: CleanTombstonesOptions): Promise<CleanTombstonesResult> {
    const retentionDays = options?.retentionDays ?? 30;
    const now = options?.now ?? new Date();
    const cutoffDate =
      options?.cutoffDate ??
      new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();

    return await this.dataSource.transaction(async (manager) => {
      const qb = manager
        .createQueryBuilder(TaskEntityModel, 'task')
        .where('task.deletedAt IS NOT NULL')
        .andWhere('task.deletedAt <= :cutoffIso', { cutoffIso });

      if (options?.userId) {
        qb.andWhere('task.userId = :userId', { userId: options.userId });
      }

      const eligibleTasks = await qb.getMany();

      if (eligibleTasks.length === 0) {
        if (options?.onBeforeCommit) {
          await options.onBeforeCommit(manager);
        }
        return {
          cleanedCount: 0,
          cleanedTaskIds: []
        };
      }

      const eligibleIds = eligibleTasks.map((t) => t.id);

      // Record in cleaned_tombstones (idempotent with ON CONFLICT DO NOTHING)
      const cleanedEntries = eligibleTasks.map((task) => {
        const entry = new CleanedTombstoneEntity();
        entry.id = randomUUID();
        entry.userId = task.userId;
        entry.entityId = task.id;
        entry.deletedAt = task.deletedAt!;
        entry.purgedAt = new Date();
        return entry;
      });

      await manager
        .createQueryBuilder()
        .insert()
        .into(CleanedTombstoneEntity)
        .values(cleanedEntries)
        .orIgnore()
        .execute();

      // Permanently remove eligible tombstones from tasks table
      await manager
        .createQueryBuilder()
        .delete()
        .from(TaskEntityModel)
        .where('id IN (:...eligibleIds)', { eligibleIds })
        .execute();

      if (options?.onBeforeCommit) {
        await options.onBeforeCommit(manager);
      }

      return {
        cleanedCount: eligibleTasks.length,
        cleanedTaskIds: eligibleIds
      };
    });
  }

  async getChanges(
    userId: string,
    cursor: string | undefined,
    limit: number
  ): Promise<PullResult> {
    const parsedCursor = cursor ? parseInt(cursor, 10) : 0;
    const currentCursor = Number.isNaN(parsedCursor) ? 0 : parsedCursor;
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const tasks = await this.taskRepo
      .createQueryBuilder('task')
      .where('task.userId = :userId', { userId })
      .andWhere('task.cursor > :currentCursor', { currentCursor: currentCursor.toString() })
      .orderBy('task.cursor', 'ASC')
      .take(safeLimit + 1)
      .getMany();

    const hasMore = tasks.length > safeLimit;
    const sliced = hasMore ? tasks.slice(0, safeLimit) : tasks;
    const nextCursor =
      sliced.length > 0
        ? String(sliced[sliced.length - 1]!.cursor)
        : String(currentCursor);

    return {
      changes: sliced.map(toTaskEntity),
      nextCursor,
      hasMore
    };
  }

  async clear(): Promise<void> {
    await this.dataSource.query('TRUNCATE TABLE sync_mutations, tasks, cleaned_tombstones CASCADE');
    try {
      await this.dataSource.query("SELECT setval('tasks_cursor_seq', 1, false)");
    } catch {
      // Ignore if sequence does not exist
    }
  }
}
