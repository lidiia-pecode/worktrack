import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every activity has a category (Phase 38 part 2, drafts removed). Destructive
 * by docs/workflow.md: it fails while any activity has none, so it runs after
 * the stand's drafts are given a category by hand and the new code is live.
 */
export class ActivitiesRequireCategory1793274784788 implements MigrationInterface {
  name = 'ActivitiesRequireCategory1793274784788';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "category_id" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "category_id" DROP NOT NULL`,
    );
  }
}
