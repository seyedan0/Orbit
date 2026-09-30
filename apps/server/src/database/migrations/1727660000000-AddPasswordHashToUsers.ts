import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordHashToUsers1727660000000 implements MigrationInterface {
  name = 'AddPasswordHashToUsers1727660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nullable: rows created before accounts existed have no credentials and
    // simply cannot sign in with a password.
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS password_hash;`);
  }
}
