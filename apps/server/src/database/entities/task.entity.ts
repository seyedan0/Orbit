import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { LocalStatus, SubTaskItem, TaskKind, TaskPriority } from '@orbit/shared-types';

@Entity('tasks')
@Index(['userId', 'cursor'])
export class TaskEntityModel {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Index()
  @Column({ name: 'project_id', type: 'varchar', length: 255, default: 'inbox' })
  projectId!: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({ name: 'desc', type: 'text', nullable: true })
  desc?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'TASK' })
  kind!: TaskKind;

  @Column({ type: 'smallint', default: 0 })
  priority!: TaskPriority;

  @Column({ name: 'is_all_day', type: 'boolean', default: false })
  isAllDay!: boolean;

  @Column({ name: 'start_date', type: 'varchar', length: 64, nullable: true })
  startDate?: string | null;

  @Column({ name: 'due_date', type: 'varchar', length: 64, nullable: true })
  dueDate?: string | null;

  @Column({ name: 'time_zone', type: 'varchar', length: 64, default: 'UTC' })
  timeZone!: string;

  @Column({ name: 'repeat_flag', type: 'varchar', length: 64, nullable: true })
  repeatFlag?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  reminders!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  items!: SubTaskItem[];

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'local_status', type: 'varchar', length: 32, default: 'SYNCED' })
  localStatus!: LocalStatus;

  @Column({ type: 'bigint', default: () => "nextval('tasks_cursor_seq')" })
  cursor!: string;

  @Column({ name: 'created_at', type: 'varchar', length: 64 })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'varchar', length: 64 })
  updatedAt!: string;

  @Column({ name: 'completed_at', type: 'varchar', length: 64, nullable: true })
  completedAt?: string | null;

  @Column({ name: 'deleted_at', type: 'varchar', length: 64, nullable: true })
  deletedAt?: string | null;

  @Column({ name: 'field_timestamps', type: 'jsonb', default: () => "'{}'" })
  fieldTimestamps!: Record<string, string>;

  @Column({ name: 'last_mutation_id', type: 'varchar', length: 255, nullable: true })
  lastMutationId?: string | null;
}

