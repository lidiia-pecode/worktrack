import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPositionAndAvatarToUser1785259007294 implements MigrationInterface {
  name = 'AddPositionAndAvatarToUser1785259007294';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "position" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatar_url" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "position"`);
  }
}
