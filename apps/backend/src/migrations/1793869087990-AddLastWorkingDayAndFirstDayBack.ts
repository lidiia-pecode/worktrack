import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastWorkingDayAndFirstDayBack1793869087990 implements MigrationInterface {
  name = 'AddLastWorkingDayAndFirstDayBack1793869087990';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "last_working_day" date`);
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" ADD "last_working_day" date NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" ADD "first_day_back" date NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" ADD CONSTRAINT "CHK_d13ff8bfb04f411b6e0b5ae1a5" CHECK ("first_day_back" > "last_working_day")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" DROP CONSTRAINT "CHK_d13ff8bfb04f411b6e0b5ae1a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" DROP COLUMN "first_day_back"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inactive_periods" DROP COLUMN "last_working_day"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "last_working_day"`,
    );
  }
}
