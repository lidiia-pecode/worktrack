import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanLastChangedBy1795524724456 implements MigrationInterface {
  name = 'PlanLastChangedBy1795524724456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD "updated_by_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD CONSTRAINT "FK_fcfb9f7d44b5f5d90113175eb8e" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_fcfb9f7d44b5f5d90113175eb8e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP COLUMN "updated_by_id"`,
    );
  }
}
