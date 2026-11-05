import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyStandardDays1793880953400 implements MigrationInterface {
  name = 'AddCompanyStandardDays1793880953400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "company_standard_days" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "created_by_id" uuid, "valid_from" date NOT NULL, "hours_per_day" numeric(4,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fbf3c200fa5f0f673beddcb53d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_company_standard_days_company_valid_from" ON "company_standard_days" ("company_id", "valid_from") `,
    );
    await queryRunner.query(
      `ALTER TABLE "company_standard_days" ADD CONSTRAINT "FK_b021203f2c3dde71ae3dccf5f6f" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_standard_days" ADD CONSTRAINT "FK_14eab16fed64060476221749889" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company_standard_days" DROP CONSTRAINT "FK_14eab16fed64060476221749889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_standard_days" DROP CONSTRAINT "FK_b021203f2c3dde71ae3dccf5f6f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_company_standard_days_company_valid_from"`,
    );
    await queryRunner.query(`DROP TABLE "company_standard_days"`);
  }
}
