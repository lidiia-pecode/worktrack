import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserInactivePeriods1793030016632 implements MigrationInterface {
  name = 'AddUserInactivePeriods1793030016632';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_inactive_periods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "user_id" uuid NOT NULL, "deactivated_at" TIMESTAMP WITH TIME ZONE NOT NULL, "reactivated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "CHK_00abe6dfe78e67e2045d9e7417" CHECK ("reactivated_at" >= "deactivated_at"), CONSTRAINT "PK_c7bc0f5ea82ce2faf394a413f6b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_inactive_periods_company_user" ON "user_inactive_periods" ("company_id", "user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" ADD CONSTRAINT "FK_1b053dd06eabc9ef2c5f854c894" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" ADD CONSTRAINT "FK_5e6e24e4c6dbf3cf06d82f69e00" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" DROP CONSTRAINT "FK_5e6e24e4c6dbf3cf06d82f69e00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" DROP CONSTRAINT "FK_1b053dd06eabc9ef2c5f854c894"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_inactive_periods_company_user"`,
    );
    await queryRunner.query(`DROP TABLE "user_inactive_periods"`);
  }
}
