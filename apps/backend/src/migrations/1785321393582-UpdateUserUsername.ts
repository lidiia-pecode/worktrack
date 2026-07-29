import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserUsername1785321393582 implements MigrationInterface {
  name = 'UpdateUserUsername1785321393582';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "username" TYPE character varying(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "username" TYPE character varying(255)
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "username" SET NOT NULL
    `);
  }
}
