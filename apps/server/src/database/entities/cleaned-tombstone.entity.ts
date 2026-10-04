import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('cleaned_tombstones')
@Index(['userId', 'entityId'], { unique: true })
export class CleanedTombstoneEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @Index()
  @Column({ name: 'entity_id', type: 'varchar', length: 255 })
  entityId!: string;

  @Column({ name: 'deleted_at', type: 'varchar', length: 64 })
  deletedAt!: string;

  @CreateDateColumn({ name: 'purged_at', type: 'timestamptz', default: () => 'NOW()' })
  purgedAt!: Date;
}
