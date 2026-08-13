import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleSignupEntity1786631215121 implements MigrationInterface {
  name = 'CreateGoogleSignupEntity1786631215121';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "google_signup_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token_hash" character varying(64) NOT NULL, "email" character varying(255) NOT NULL, "first_name" character varying(255) NOT NULL, "last_name" character varying(255) NOT NULL, "google_id" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7ae6d90b13d252698939151d4c1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_google_signup_tokens_token_hash" ON "google_signup_tokens" ("token_hash") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_google_signup_tokens_token_hash"`,
    );
    await queryRunner.query(`DROP TABLE "google_signup_tokens"`);
  }
}
