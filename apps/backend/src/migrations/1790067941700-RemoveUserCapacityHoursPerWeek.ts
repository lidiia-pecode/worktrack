import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Destructive: apply after the new code is serving, not before. Capacity now
 * lives in "user_capacities", backfilled by the previous migration.
 */
export class RemoveUserCapacityHoursPerWeek1790067941700 implements MigrationInterface {
  name = 'RemoveUserCapacityHoursPerWeek1790067941700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "capacity_hours_per_week"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "capacity_hours_per_week" numeric(5,2) NOT NULL DEFAULT '40'`,
    );
  }
}
