import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUserUsername1790938881365 implements MigrationInterface {
  name = 'DropUserUsername1790938881365';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_users_username"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "username" character varying(20)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_username" ON "users" ("username") WHERE (username IS NOT NULL)`,
    );
  }
}
