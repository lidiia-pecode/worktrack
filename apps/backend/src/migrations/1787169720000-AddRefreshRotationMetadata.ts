import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshRotationMetadata1787169720000 implements MigrationInterface {
  name = 'AddRefreshRotationMetadata1787169720000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD "previous_refresh_hash" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD "rotated_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP COLUMN "rotated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP COLUMN "previous_refresh_hash"`,
    );
  }
}
