import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCleanedTombstonesTable1727680000000 implements MigrationInterface {
  name = 'CreateCleanedTombstonesTable1727680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cleaned_tombstones (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        deleted_at VARCHAR(64) NOT NULL,
        purged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_cleaned_tombstones_user_entity UNIQUE (user_id, entity_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cleaned_tombstones_user_entity
      ON cleaned_tombstones (user_id, entity_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cleaned_tombstones;`);
  }
}
