import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserCapacityEntity1790067941662 implements MigrationInterface {
  name = 'CreateUserCapacityEntity1790067941662';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_capacities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "user_id" uuid NOT NULL, "created_by_id" uuid, "valid_from" date NOT NULL, "minutes_per_week" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_ca95bc601158f22eb5ba57326e" CHECK ("minutes_per_week" >= 0 AND "minutes_per_week" <= 10080), CONSTRAINT "PK_db8788d8e7b9cacd2ccbdaea70e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_capacities_company_user_valid_from" ON "user_capacities" ("company_id", "user_id", "valid_from") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_capacities" ADD CONSTRAINT "FK_7cfb11524490f1c16c515b4fd0a" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_capacities" ADD CONSTRAINT "FK_234688f7db37cfdc7307882efc5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_capacities" ADD CONSTRAINT "FK_5df5d3366a2c66e9da18314553a" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Only people whose hours differ from the company default need a row; the
    // rest keep following the default. Dated from when the person was created,
    // so their existing weeks keep the figure they were measured against.
    await queryRunner.query(`
      INSERT INTO "user_capacities" ("company_id", "user_id", "valid_from", "minutes_per_week")
      SELECT u."company_id", u."id", u."created_at"::date, ROUND(u."capacity_hours_per_week" * 60)::int
      FROM "users" u
      JOIN "companies" c ON c."id" = u."company_id"
      WHERE ROUND(u."capacity_hours_per_week" * 60)::int
            <> ROUND(c."standard_work_hours_per_day" * 60)::int * 5
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_capacities" DROP CONSTRAINT "FK_5df5d3366a2c66e9da18314553a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_capacities" DROP CONSTRAINT "FK_234688f7db37cfdc7307882efc5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_capacities" DROP CONSTRAINT "FK_7cfb11524490f1c16c515b4fd0a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_user_capacities_company_user_valid_from"`,
    );
    await queryRunner.query(`DROP TABLE "user_capacities"`);
  }
}
