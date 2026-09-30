import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSyncSchema1727650000000 implements MigrationInterface {
  name = 'InitialSyncSchema1727650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS tasks_cursor_seq;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL DEFAULT 'inbox',
        user_id VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        "desc" TEXT,
        kind VARCHAR(32) NOT NULL DEFAULT 'TASK',
        priority SMALLINT NOT NULL DEFAULT 0,
        is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
        start_date VARCHAR(64),
        due_date VARCHAR(64),
        time_zone VARCHAR(64) NOT NULL DEFAULT 'UTC',
        repeat_flag VARCHAR(64),
        reminders JSONB NOT NULL DEFAULT '[]',
        items JSONB NOT NULL DEFAULT '[]',
        version INTEGER NOT NULL DEFAULT 1,
        local_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED',
        cursor BIGINT NOT NULL DEFAULT nextval('tasks_cursor_seq'),
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL,
        completed_at VARCHAR(64),
        deleted_at VARCHAR(64)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tasks_user_cursor ON tasks (user_id, cursor);`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tasks_user_project ON tasks (user_id, project_id);`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sync_mutations (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        idempotency_key VARCHAR(255) NOT NULL,
        entity_type VARCHAR(32) NOT NULL DEFAULT 'TASK',
        entity_id VARCHAR(255) NOT NULL,
        operation VARCHAR(32) NOT NULL,
        base_version INTEGER NOT NULL DEFAULT 0,
        payload_type VARCHAR(32) NOT NULL DEFAULT 'FULL',
        payload JSONB NOT NULL,
        field_timestamps JSONB NOT NULL DEFAULT '{}',
        created_at VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_sync_mutations_user_idempotency UNIQUE (user_id, idempotency_key)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sync_mutations_user_created ON sync_mutations (user_id, created_at);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sync_mutations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS tasks_cursor_seq;`);
    await queryRunner.query(`DROP TABLE IF EXISTS workspaces;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
  }
}
