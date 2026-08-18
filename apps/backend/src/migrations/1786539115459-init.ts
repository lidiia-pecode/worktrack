import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1786539115459 implements MigrationInterface {
  name = 'Init1786539115459';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "public"."act_category_status_enum" AS ENUM('ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "act_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "status" "public"."act_category_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e4c7330796a6f6784b9acdddd15" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_act_categories_company_id" ON "act_categories" ("company_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."team_status_enum" AS ENUM('ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "status" "public"."team_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_teams_company_name" ON "teams" ("company_id", "name") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."team_role_enum" AS ENUM('MEMBER', 'MANAGER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "team_memberships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "team_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role_in_team" "public"."team_role_enum" NOT NULL DEFAULT 'MEMBER', "joined_at" date NOT NULL, "left_at" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_9ca7027ad3f5a71d04d4ef25a0" CHECK ("left_at" IS NULL OR "left_at" >= "joined_at"), CONSTRAINT "PK_053171f713ec8a2f09ed58f08f7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_team_memberships_active_user" ON "team_memberships" ("team_id", "user_id") WHERE "left_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_team_memberships_team_lookup" ON "team_memberships" ("team_id", "joined_at", "left_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_team_memberships_user_lookup" ON "team_memberships" ("user_id", "joined_at", "left_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_team_memberships_company_id" ON "team_memberships" ("company_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "planning_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "user_id" uuid NOT NULL, "project_activity_id" uuid NOT NULL, "created_by_id" uuid, "date" date NOT NULL, "planned_minutes" integer NOT NULL, "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_7136981054f320e1ddece65598" CHECK ("planned_minutes" > 0 AND "planned_minutes" <= 1440), CONSTRAINT "PK_5d00e95961ee65339f8de243e38" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_planning_company_activity_date" ON "planning_entries" ("company_id", "project_activity_id", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_planning_company_user_date" ON "planning_entries" ("company_id", "user_id", "date") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_planning_company_user_activity_date" ON "planning_entries" ("company_id", "user_id", "project_activity_id", "date") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('EMPLOYEE', 'MANAGER', 'OWNER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_status_enum" AS ENUM('INVITED', 'ACTIVE', 'DEACTIVATED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'EMPLOYEE', "status" "public"."user_status_enum" NOT NULL DEFAULT 'ACTIVE', "position" character varying(255), "avatar_url" character varying(255), "first_name" character varying(255) NOT NULL, "last_name" character varying(255) NOT NULL, "username" character varying(20), "email" character varying(255) NOT NULL, "password_hash" character varying(255), "google_id" character varying(255), "capacity_hours_per_week" numeric(5,2) NOT NULL DEFAULT '40', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_google_id" ON "users" ("google_id") WHERE google_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_username" ON "users" ("username") WHERE username IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_company_id" ON "users" ("company_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_status_enum" AS ENUM('ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "client_name" character varying(255), "description" text, "status" "public"."project_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_company_id" ON "projects" ("company_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "company_id" uuid NOT NULL, "project_id" uuid NOT NULL, "activity_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6eb51f5c77db8b30ebf1cb87d04" UNIQUE ("project_id", "activity_id"), CONSTRAINT "PK_f322a4f9aed232d8868d54ec30c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_activities_activity_id" ON "project_activities" ("activity_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_activities_company_id" ON "project_activities" ("company_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_status_enum" AS ENUM('ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "is_absence" boolean NOT NULL DEFAULT false, "default_billable" boolean NOT NULL DEFAULT true, "status" "public"."activity_status_enum" NOT NULL DEFAULT 'ACTIVE', "category_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_category_id" ON "activities" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_company_id" ON "activities" ("company_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reporting_period_status_enum" AS ENUM('OPEN', 'LOCKED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reporting_periods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "public"."reporting_period_status_enum" NOT NULL DEFAULT 'OPEN', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_9b4bc0589a321f3a287b640e79" CHECK ("end_date" >= "start_date"), CONSTRAINT "PK_7041c039945557174b139d7739f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reporting_periods_company_dates" ON "reporting_periods" ("company_id", "start_date", "end_date") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_reporting_periods_company_name" ON "reporting_periods" ("company_id", "name") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."company_status_enum" AS ENUM('ACTIVE', 'SUSPENDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."week_day_enum" AS ENUM('MONDAY', 'SUNDAY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_name" character varying(255) NOT NULL, "slug" character varying(100) NOT NULL, "status" "public"."company_status_enum" NOT NULL DEFAULT 'ACTIVE', "timezone" character varying(50) NOT NULL DEFAULT 'UTC', "currency" character varying(3) NOT NULL DEFAULT 'USD', "week_start_day" "public"."week_day_enum" NOT NULL DEFAULT 'MONDAY', "standard_work_hours_per_day" numeric(4,2) NOT NULL DEFAULT '8', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_companies_slug" ON "companies" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "time_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "user_id" uuid NOT NULL, "project_activity_id" uuid NOT NULL, "is_billable" boolean NOT NULL DEFAULT true, "minutes" integer NOT NULL, "note" text, "date" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_1b5b81754f1f14829837a88468" CHECK ("minutes" > 0 AND "minutes" <= 1440), CONSTRAINT "PK_8657e6aaa7035da9fc7309f385a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_time_logs_company_activity_date" ON "time_logs" ("company_id", "project_activity_id", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_time_logs_company_user_date" ON "time_logs" ("company_id", "user_id", "date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "company_id" uuid NOT NULL, "refresh_hash" character varying(64) NOT NULL, "ip" character varying(45), "user_agent" character varying(500), "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_641507381f32580e8479efc36cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_sessions_expires_at" ON "auth_sessions" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_sessions_company_id" ON "auth_sessions" ("company_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_sessions_user_id" ON "auth_sessions" ("user_id") `,
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
      `ALTER TABLE "act_categories" ADD CONSTRAINT "FK_05cf14af8d564a9eeb486385661" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD CONSTRAINT "FK_10a590f29449a3a83c9fcd5b3b3" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_memberships" ADD CONSTRAINT "FK_d3e36e83ff9460c51a593b64f6b" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_memberships" ADD CONSTRAINT "FK_b917b8603c6d5c526fcdb2009de" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_memberships" ADD CONSTRAINT "FK_c9eb2ded8e0e2f4bcb41fd0984a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD CONSTRAINT "FK_e44793807316ce15bec8d80b851" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD CONSTRAINT "FK_f7bf6c8bdc34069a51f74c5e726" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD CONSTRAINT "FK_629845b17270e6cfd80ac843403" FOREIGN KEY ("project_activity_id") REFERENCES "project_activities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" ADD CONSTRAINT "FK_3e2485b4d6552b85633bf0d0116" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_7ae6334059289559722437bcc1c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_c8708288b8e6a060ed7b9e1a226" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" ADD CONSTRAINT "FK_33c9d5663ef4e9335ffb655e99a" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" ADD CONSTRAINT "FK_da57aaa2cda866acedacc09867f" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" ADD CONSTRAINT "FK_bd4a92cefde094beeecea25af19" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_bf5e03addfb573f5dcd31ae5e28" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_cf4a8062ad267056ddd5f867ac1" FOREIGN KEY ("category_id") REFERENCES "act_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" ADD CONSTRAINT "FK_9ac9985ba237aeb0e39a3690b69" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" ADD CONSTRAINT "FK_8112bdc312378f15dd0555198d7" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" ADD CONSTRAINT "FK_b5e06aedfbf8f061e3e68ad154e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" ADD CONSTRAINT "FK_fcbe2e6a2c3895863bbe71fc959" FOREIGN KEY ("project_activity_id") REFERENCES "project_activities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_14a0399a67c29bfa41005dc002e" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_users" ADD CONSTRAINT "FK_3a53b25fef9b1ac81501a2816a5" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_users" ADD CONSTRAINT "FK_076af26ee5a7bbcce3f77bfddfb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_projects_company_name_lower" ON "projects" ("company_id", (LOWER("name")))`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_act_categories_company_name_lower" ON "act_categories" ("company_id", (LOWER("name")))`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activities_company_category_name_lower" ON "activities" ("company_id", "category_id", (LOWER("name")))`,
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
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_14a0399a67c29bfa41005dc002e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP CONSTRAINT "FK_fcbe2e6a2c3895863bbe71fc959"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP CONSTRAINT "FK_b5e06aedfbf8f061e3e68ad154e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP CONSTRAINT "FK_8112bdc312378f15dd0555198d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reporting_periods" DROP CONSTRAINT "FK_9ac9985ba237aeb0e39a3690b69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_cf4a8062ad267056ddd5f867ac1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_bf5e03addfb573f5dcd31ae5e28"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" DROP CONSTRAINT "FK_bd4a92cefde094beeecea25af19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" DROP CONSTRAINT "FK_da57aaa2cda866acedacc09867f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_activities" DROP CONSTRAINT "FK_33c9d5663ef4e9335ffb655e99a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_c8708288b8e6a060ed7b9e1a226"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_7ae6334059289559722437bcc1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_3e2485b4d6552b85633bf0d0116"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_629845b17270e6cfd80ac843403"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_f7bf6c8bdc34069a51f74c5e726"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planning_entries" DROP CONSTRAINT "FK_e44793807316ce15bec8d80b851"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_memberships" DROP CONSTRAINT "FK_c9eb2ded8e0e2f4bcb41fd0984a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_memberships" DROP CONSTRAINT "FK_b917b8603c6d5c526fcdb2009de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_memberships" DROP CONSTRAINT "FK_d3e36e83ff9460c51a593b64f6b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_10a590f29449a3a83c9fcd5b3b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "act_categories" DROP CONSTRAINT "FK_05cf14af8d564a9eeb486385661"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_076af26ee5a7bbcce3f77bfddf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a53b25fef9b1ac81501a2816a"`,
    );
    await queryRunner.query(`DROP TABLE "project_users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_auth_sessions_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_auth_sessions_company_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_auth_sessions_expires_at"`,
    );
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_time_logs_company_user_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_time_logs_company_activity_date"`,
    );
    await queryRunner.query(`DROP TABLE "time_logs"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_companies_slug"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TYPE "public"."week_day_enum"`);
    await queryRunner.query(`DROP TYPE "public"."company_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_reporting_periods_company_name"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reporting_periods_company_dates"`,
    );
    await queryRunner.query(`DROP TABLE "reporting_periods"`);
    await queryRunner.query(
      `DROP TYPE "public"."reporting_period_status_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_activities_company_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_activities_category_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_activities_company_category_name_lower"`,
    );

    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(`DROP TYPE "public"."activity_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_activities_company_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_activities_activity_id"`,
    );

    await queryRunner.query(`DROP TABLE "project_activities"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_projects_company_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_projects_company_name_lower"`,
    );

    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TYPE "public"."project_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_company_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_username"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_google_id"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_planning_company_user_activity_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_planning_company_user_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_planning_company_activity_date"`,
    );
    await queryRunner.query(`DROP TABLE "planning_entries"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_team_memberships_company_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_team_memberships_user_lookup"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_team_memberships_team_lookup"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_team_memberships_active_user"`,
    );
    await queryRunner.query(`DROP TABLE "team_memberships"`);
    await queryRunner.query(`DROP TYPE "public"."team_role_enum"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_teams_company_name"`);
    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(`DROP TYPE "public"."team_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_act_categories_company_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_act_categories_company_name_lower"`,
    );
    await queryRunner.query(`DROP TABLE "act_categories"`);
    await queryRunner.query(`DROP TYPE "public"."act_category_status_enum"`);
  }
}
