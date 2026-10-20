import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Weekends and absence days cannot be planned any more, but plans made before
 * those rules still count towards week totals and the weekly limit. Both kinds
 * are deleted wherever they are, locked months included.
 */
export class DeletePlansOnWeekendsAndAbsences1792508900192 implements MigrationInterface {
  name = 'DeletePlansOnWeekendsAndAbsences1792508900192';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "planning_entries" WHERE EXTRACT(ISODOW FROM "date") IN (6, 7)`,
    );
    await queryRunner.query(`
      DELETE FROM "planning_entries" p
      USING "absences" a
      WHERE a."company_id" = p."company_id"
        AND a."user_id" = p."user_id"
        AND p."date" BETWEEN a."start_date" AND a."end_date"
    `);
  }

  // The deleted plans are gone, so there is nothing to restore.
  public async down(): Promise<void> {}
}
