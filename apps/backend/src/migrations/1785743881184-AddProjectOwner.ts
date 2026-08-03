import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectOwner1785743881184 implements MigrationInterface {
  name = 'AddProjectOwner1785743881184';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "owner_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_b1bd2fbf5d0ef67319c91acb5cf" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_b1bd2fbf5d0ef67319c91acb5cf"`,
    );
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "owner_id"`);
  }
}
