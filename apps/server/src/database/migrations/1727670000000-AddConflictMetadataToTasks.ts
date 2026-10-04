import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConflictMetadataToTasks1727670000000 implements MigrationInterface {
  name = 'AddConflictMetadataToTasks1727670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS field_timestamps JSONB NOT NULL DEFAULT '{}';`
    );
    await queryRunner.query(
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_mutation_id VARCHAR(255);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS last_mutation_id;`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS field_timestamps;`);
  }
}
