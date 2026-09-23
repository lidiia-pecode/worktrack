import { MigrationInterface, QueryRunner } from 'typeorm';

export class MonthlyReportingPeriods1790153422210 implements MigrationInterface {
  name = 'MonthlyReportingPeriods1790153422210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Free-form periods are replaced by automatic monthly locking, so the old
    // rows have no meaning in the new shape.
    await queryRunner.query(`DELETE FROM "reporting_periods"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reporting_periods_company_dates"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_reporting_periods_company_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" DROP CONSTRAINT "CHK_9b4bc0589a321f3a287b640e79"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" DROP COLUMN "start_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" DROP COLUMN "end_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" DROP COLUMN "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ADD "month" date NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ADD "changed_by_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_reporting_periods_company_month" ON "reporting_periods" ("company_id", "month") `,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ADD CONSTRAINT "CHK_6901f4d798bf520377fc22ba27" CHECK (EXTRACT(DAY FROM "month") = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ADD CONSTRAINT "FK_abdc98c5b9479c9ba7468fc5e1f" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "reporting_periods"`);
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" DROP CONSTRAINT "FK_abdc98c5b9479c9ba7468fc5e1f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" DROP CONSTRAINT "CHK_6901f4d798bf520377fc22ba27"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_reporting_periods_company_month"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ALTER COLUMN "status" SET DEFAULT 'OPEN'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" DROP COLUMN "changed_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" DROP COLUMN "month"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ADD "name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ADD "end_date" date NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ADD "start_date" date NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ADD CONSTRAINT "CHK_9b4bc0589a321f3a287b640e79" CHECK ((end_date >= start_date))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_reporting_periods_company_name" ON "reporting_periods" ("company_id", "name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reporting_periods_company_dates" ON "reporting_periods" ("company_id", "start_date", "end_date") `,
    );
  }
}
