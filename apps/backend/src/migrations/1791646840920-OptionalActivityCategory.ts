import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * An activity may have no category until it is put on a project. Its name was
 * unique within its category in the index, while the service has always kept
 * it unique in the company; with no category the index would not hold at all,
 * since every NULL is distinct, so it now keeps the service's rule.
 */
export class OptionalActivityCategory1791646840920 implements MigrationInterface {
  name = 'OptionalActivityCategory1791646840920';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = (await queryRunner.query(
      `SELECT "company_id", string_agg("name", ', ' ORDER BY "name") AS "names"
         FROM "activities"
         GROUP BY "company_id", LOWER("name")
         HAVING COUNT(*) > 1`,
    )) as Array<{ company_id: string; names: string }>;

    if (duplicates.length > 0) {
      const found = duplicates
        .map((row) => `company ${row.company_id}: ${row.names}`)
        .join('; ');
      throw new Error(
        `Activity names must be unique in a company before this migration. Rename these first: ${found}`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "category_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activities_company_name_lower" ON "activities" ("company_id", (LOWER("name")))`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_activities_company_category_name_lower"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      `SELECT COUNT(*) AS "count" FROM "activities" WHERE "category_id" IS NULL`,
    )) as Array<{ count: string }>;

    if (Number(count) > 0) {
      throw new Error(
        `${count} activities have no category. Give each one a category before reverting this migration.`,
      );
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activities_company_category_name_lower" ON "activities" ("company_id", "category_id", (LOWER("name")))`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_activities_company_name_lower"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "category_id" SET NOT NULL`,
    );
  }
}
