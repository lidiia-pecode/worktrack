import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaseInsensitiveTeamNames1790163550307 implements MigrationInterface {
  name = 'CaseInsensitiveTeamNames1790163550307';

  // Team names keep their case now, so the index keeps them unique regardless
  // of it, like the project, activity and category indexes.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_teams_company_name_lower" ON "teams" ("company_id", (LOWER("name")))`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_teams_company_name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_teams_company_name" ON "teams" ("company_id", "name") `,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_teams_company_name_lower"`,
    );
  }
}
