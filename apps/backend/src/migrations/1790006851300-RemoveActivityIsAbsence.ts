import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveActivityIsAbsence1790006851300 implements MigrationInterface {
  name = 'RemoveActivityIsAbsence1790006851300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "is_absence"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "is_absence" boolean NOT NULL DEFAULT false`,
    );
  }
}
