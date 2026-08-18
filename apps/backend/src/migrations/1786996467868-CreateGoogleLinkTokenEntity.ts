import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleLinkTokenEntity1786996467868 implements MigrationInterface {
  name = 'CreateGoogleLinkTokenEntity1786996467868';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "google_link_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token_hash" character varying(64) NOT NULL, "user_id" uuid NOT NULL, "google_id" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bf5deeda7945538c180f361841b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_google_link_tokens_token_hash" ON "google_link_tokens" ("token_hash") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_google_link_tokens_token_hash"`,
    );
    await queryRunner.query(`DROP TABLE "google_link_tokens"`);
  }
}
