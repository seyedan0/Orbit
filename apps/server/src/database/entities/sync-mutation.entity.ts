import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import type {
  EntityType,
  FieldTimestampMap,
  MutationOperation,
  MutationPayloadType
} from '@orbit/shared-types';

@Entity('sync_mutations')
@Index(['userId', 'idempotencyKey'], { unique: true })
@Index(['userId', 'createdAt'])
export class SyncMutationEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  idempotencyKey!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 32, default: 'TASK' })
  entityType!: EntityType;

  @Index()
  @Column({ name: 'entity_id', type: 'varchar', length: 255 })
  entityId!: string;

  @Column({ type: 'varchar', length: 32 })
  operation!: MutationOperation;

  @Column({ name: 'base_version', type: 'integer', default: 0 })
  baseVersion!: number;

  @Column({ name: 'payload_type', type: 'varchar', length: 32, default: 'FULL' })
  payloadType!: MutationPayloadType;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'field_timestamps', type: 'jsonb', default: () => "'{}'" })
  fieldTimestamps!: FieldTimestampMap;

  @Column({ name: 'created_at', type: 'varchar', length: 64 })
  createdAt!: string;

  @CreateDateColumn({ name: 'applied_at', type: 'timestamptz', default: () => 'NOW()' })
  appliedAt!: Date;
}
