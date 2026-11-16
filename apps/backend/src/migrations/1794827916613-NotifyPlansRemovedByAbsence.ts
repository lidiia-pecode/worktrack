import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotifyPlansRemovedByAbsence1794827916613 implements MigrationInterface {
  name = 'NotifyPlansRemovedByAbsence1794827916613';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" ADD "details" jsonb`);
    // Adds the value in place, so nothing the running code reads changes.
    await queryRunner.query(
      `ALTER TYPE "public"."notification_type_enum" ADD VALUE 'PLANS_REMOVED_BY_ABSENCE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The old type can't hold them, so these notifications go first.
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type" = 'PLANS_REMOVED_BY_ABSENCE'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_type_enum_old" AS ENUM('INVITATION_ACCEPTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notification_type_enum_old" USING "type"::"text"::"public"."notification_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notification_type_enum_old" RENAME TO "notification_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "details"`,
    );
  }
}
