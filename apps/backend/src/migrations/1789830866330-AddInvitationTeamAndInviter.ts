import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitationTeamAndInviter1789830866330 implements MigrationInterface {
  name = 'AddInvitationTeamAndInviter1789830866330';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invitations" ADD "team_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD "invited_by_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_67a78e8571040a0deb60ee6c319" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_d4de0403dd012cf87b430af70ef" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_d4de0403dd012cf87b430af70ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_67a78e8571040a0deb60ee6c319"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP COLUMN "invited_by_id"`,
    );
    await queryRunner.query(`ALTER TABLE "invitations" DROP COLUMN "team_id"`);
  }
}
