import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1784749059738 implements MigrationInterface {
  name = 'Init1784749059738';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."act_categories_status_enum" AS ENUM('active', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "act_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "status" "public"."act_categories_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f700490e5f854f8597d4aaa95b4" UNIQUE ("name"), CONSTRAINT "PK_e4c7330796a6f6784b9acdddd15" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activities_status_enum" AS ENUM('active', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "status" "public"."activities_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "category_id" uuid NOT NULL, CONSTRAINT "UQ_a7455bc944cd82d40cc41e83c46" UNIQUE ("name"), CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid NOT NULL, "activity_id" uuid NOT NULL, CONSTRAINT "UQ_6eb51f5c77db8b30ebf1cb87d04" UNIQUE ("project_id", "activity_id"), CONSTRAINT "PK_f322a4f9aed232d8868d54ec30c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."projects_status_enum" AS ENUM('active', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "status" "public"."projects_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2187088ab5ef2a918473cb99007" UNIQUE ("name"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('manager', 'employee', 'administrator')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" "public"."user_role" NOT NULL DEFAULT 'employee', "first_name" character varying(255) NOT NULL, "last_name" character varying(255) NOT NULL, "username" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255), "google_id" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_0bd5012aeb82628e07f6a1be53b" UNIQUE ("google_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_sessions" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "refresh_hash" character varying(64) NOT NULL, CONSTRAINT "PK_641507381f32580e8479efc36cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "time_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_billable" boolean NOT NULL DEFAULT true, "time" integer NOT NULL, "note" text, "date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "project_activity_id" uuid NOT NULL, CONSTRAINT "CHK_8df388fac7a6aaf9a725e62e5b" CHECK ("time" > 0 AND "time" <= 1440), CONSTRAINT "PK_8657e6aaa7035da9fc7309f385a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_users" ("project_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_4d392d4703ae37be0cc9a253175" PRIMARY KEY ("project_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a53b25fef9b1ac81501a2816a" ON "project_users" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_076af26ee5a7bbcce3f77bfddf" ON "project_users" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_cf4a8062ad267056ddd5f867ac1" FOREIGN KEY ("category_id") REFERENCES "act_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" ADD CONSTRAINT "FK_da57aaa2cda866acedacc09867f" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" ADD CONSTRAINT "FK_bd4a92cefde094beeecea25af19" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" ADD CONSTRAINT "FK_b5e06aedfbf8f061e3e68ad154e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" ADD CONSTRAINT "FK_fcbe2e6a2c3895863bbe71fc959" FOREIGN KEY ("project_activity_id") REFERENCES "project_activities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_users" ADD CONSTRAINT "FK_3a53b25fef9b1ac81501a2816a5" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_users" ADD CONSTRAINT "FK_076af26ee5a7bbcce3f77bfddfb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_users" DROP CONSTRAINT "FK_076af26ee5a7bbcce3f77bfddfb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_users" DROP CONSTRAINT "FK_3a53b25fef9b1ac81501a2816a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP CONSTRAINT "FK_fcbe2e6a2c3895863bbe71fc959"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP CONSTRAINT "FK_b5e06aedfbf8f061e3e68ad154e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" DROP CONSTRAINT "FK_bd4a92cefde094beeecea25af19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" DROP CONSTRAINT "FK_da57aaa2cda866acedacc09867f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_cf4a8062ad267056ddd5f867ac1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_076af26ee5a7bbcce3f77bfddf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a53b25fef9b1ac81501a2816a"`,
    );
    await queryRunner.query(`DROP TABLE "project_users"`);
    await queryRunner.query(`DROP TABLE "time_logs"`);
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
    await queryRunner.query(`DROP TABLE "project_activities"`);
    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(`DROP TYPE "public"."activities_status_enum"`);
    await queryRunner.query(`DROP TABLE "act_categories"`);
    await queryRunner.query(`DROP TYPE "public"."act_categories_status_enum"`);
  }
}
