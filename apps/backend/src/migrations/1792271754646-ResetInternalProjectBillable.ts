import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Billable now counts on every project, so entries on internal projects that
 * kept the activity's default are switched off. The reports never counted
 * them, so no past billable figure changes. "Internal" is the reports' own
 * rule: an empty or missing client name.
 */
export class ResetInternalProjectBillable1792271754646 implements MigrationInterface {
  name = 'ResetInternalProjectBillable1792271754646';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "time_logs" tl
      SET "is_billable" = false
      FROM "project_activities" pa
      JOIN "projects" p ON p."id" = pa."project_id"
      WHERE pa."id" = tl."project_activity_id"
        AND NULLIF(p."client_name", '') IS NULL
        AND tl."is_billable"
    `);
  }

  // The flags that were switched off can't be told apart afterwards, so there
  // is nothing to restore.
  public async down(): Promise<void> {}
}
