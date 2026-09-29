import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanySetupFinishedAt1790715298530 implements MigrationInterface {
  name = 'AddCompanySetupFinishedAt1790715298530';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "setup_finished_at" TIMESTAMP WITH TIME ZONE`,
    );
    // Companies that exist already are past their first run, so the setup
    // guide does not appear for them.
    await queryRunner.query(
      `UPDATE "companies" SET "setup_finished_at" = now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "setup_finished_at"`,
    );
  }
}
