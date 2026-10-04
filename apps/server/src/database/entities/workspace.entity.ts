import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('workspaces')
export class WorkspaceEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
