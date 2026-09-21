import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAbsenceEntity1790004090909 implements MigrationInterface {
  name = 'CreateAbsenceEntity1790004090909';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."absence_type_enum" AS ENUM('VACATION', 'SICK_LEAVE', 'PUBLIC_HOLIDAY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "absences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "user_id" uuid NOT NULL, "type" "public"."absence_type_enum" NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_b7fad80b019b3314003edd4eef" CHECK ("end_date" >= "start_date"), CONSTRAINT "PK_bd79346866fea8ac6f269252748" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_absences_company_user_start" ON "absences" ("company_id", "user_id", "start_date") `,
    );
    await queryRunner.query(
      `ALTER TABLE "absences" ADD CONSTRAINT "FK_4ed2bf8bb9cdf04aeb5b3da5e26" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "absences" ADD CONSTRAINT "FK_ad1bb527e74c350a6c31db0637b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "absences" DROP CONSTRAINT "FK_ad1bb527e74c350a6c31db0637b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "absences" DROP CONSTRAINT "FK_4ed2bf8bb9cdf04aeb5b3da5e26"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_absences_company_user_start"`,
    );
    await queryRunner.query(`DROP TABLE "absences"`);
    await queryRunner.query(`DROP TYPE "public"."absence_type_enum"`);
  }
}
