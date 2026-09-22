import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanningEntryProjectLevel1790075549027 implements MigrationInterface {
  name = 'PlanningEntryProjectLevel1790075549027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD "project_id" uuid`,
    );

    await queryRunner.query(`
      UPDATE "planning_entries" pe
      SET "project_id" = pa."project_id"
      FROM "project_activities" pa
      WHERE pa."id" = pe."project_activity_id"
    `);

    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          "id",
          SUM("planned_minutes") OVER (
            PARTITION BY "company_id", "user_id", "project_id", "date"
          ) AS merged,
          ROW_NUMBER() OVER (
            PARTITION BY "company_id", "user_id", "project_id", "date"
            ORDER BY "created_at", "id"
          ) AS rn
        FROM "planning_entries"
        WHERE "project_id" IS NOT NULL
      )
      UPDATE "planning_entries" pe
      SET "planned_minutes" = LEAST(ranked.merged, 1440)
      FROM ranked
      WHERE pe."id" = ranked."id" AND ranked.rn = 1
    `);

    await queryRunner.query(`
      DELETE FROM "planning_entries" pe
      USING (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            PARTITION BY "company_id", "user_id", "project_id", "date"
            ORDER BY "created_at", "id"
          ) AS rn
        FROM "planning_entries"
        WHERE "project_id" IS NOT NULL
      ) duplicates
      WHERE pe."id" = duplicates."id" AND duplicates.rn > 1
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_planning_company_project_date" ON "planning_entries" ("company_id", "project_id", "date") `,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD CONSTRAINT "FK_1ae0c6ef1a414b529890112de7c" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  /** Merged rows cannot be split apart again; only the new column goes away. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_1ae0c6ef1a414b529890112de7c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_planning_company_project_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP COLUMN "project_id"`,
    );
  }
}
