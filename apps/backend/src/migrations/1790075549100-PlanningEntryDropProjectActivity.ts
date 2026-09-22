import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanningEntryDropProjectActivity1790075549100 implements MigrationInterface {
  name = 'PlanningEntryDropProjectActivity1790075549100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "planning_entries" pe
      SET "project_id" = pa."project_id"
      FROM "project_activities" pa
      WHERE pa."id" = pe."project_activity_id" AND pe."project_id" IS NULL
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
      ) duplicates
      WHERE pe."id" = duplicates."id" AND duplicates.rn > 1
    `);

    await queryRunner.query(
      `ALTER TABLE "planning_entries" ALTER COLUMN "project_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_planning_company_user_project_date" ON "planning_entries" ("company_id", "user_id", "project_id", "date") `,
    );

    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_629845b17270e6cfd80ac843403"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_planning_company_activity_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_planning_company_user_activity_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP COLUMN "project_activity_id"`,
    );
  }

  /** The activity each entry named is gone, so the restored column is empty. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD "project_activity_id" uuid`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_planning_company_user_activity_date" ON "planning_entries" ("company_id", "user_id", "project_activity_id", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_planning_company_activity_date" ON "planning_entries" ("company_id", "project_activity_id", "date") `,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_planning_company_user_project_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ALTER COLUMN "project_id" DROP NOT NULL`,
    );
  }
}
