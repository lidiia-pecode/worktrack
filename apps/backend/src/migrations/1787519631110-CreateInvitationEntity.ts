import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvitationEntity1787519631110 implements MigrationInterface {
  name = 'CreateInvitationEntity1787519631110';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."invitation_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'EMPLOYEE', "status" "public"."invitation_status_enum" NOT NULL DEFAULT 'PENDING', "token_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "accepted_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_invitations_pending_company_email" ON "invitations" ("company_id", "email") WHERE status = 'PENDING'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitations_email" ON "invitations" ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_invitations_token_hash" ON "invitations" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitations_company_id" ON "invitations" ("company_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_53407578b13649da4cac07455ad" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_53407578b13649da4cac07455ad"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_invitations_company_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invitations_token_hash"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invitations_email"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_invitations_pending_company_email"`,
    );
    await queryRunner.query(`DROP TABLE "invitations"`);
    await queryRunner.query(`DROP TYPE "public"."invitation_status_enum"`);
  }
}
