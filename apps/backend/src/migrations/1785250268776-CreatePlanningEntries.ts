import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlanningEntries1785250268776 implements MigrationInterface {
  name = 'CreatePlanningEntries1785250268776';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "planning_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "time" integer NOT NULL, "note" text, "date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "created_by" uuid, "project_id" uuid NOT NULL, CONSTRAINT "UQ_planning_employee_project_date" UNIQUE ("employee_id", "project_id", "date"), CONSTRAINT "CHK_f8063e3c9bfcc0901c8147a69b" CHECK ("time" > 0 AND "time" <= 1440), CONSTRAINT "PK_5d00e95961ee65339f8de243e38" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_planning_project_date" ON "planning_entries" ("project_id", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_planning_employee_date" ON "planning_entries" ("employee_id", "date") `,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD CONSTRAINT "FK_b49a564a0d6e56237711a10c11d" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD CONSTRAINT "FK_5509d257296c0f2285808845ba6" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD CONSTRAINT "FK_1ae0c6ef1a414b529890112de7c" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_1ae0c6ef1a414b529890112de7c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_5509d257296c0f2285808845ba6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_b49a564a0d6e56237711a10c11d"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_planning_employee_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_planning_project_date"`);
    await queryRunner.query(`DROP TABLE "planning_entries"`);
  }
}
