import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDeactivatedAt1792853860111 implements MigrationInterface {
  name = 'AddUserDeactivatedAt1792853860111';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "deactivated_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deactivated_at"`);
  }
}
