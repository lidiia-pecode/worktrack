import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartDayAbsences1795463230262 implements MigrationInterface {
  name = 'AddPartDayAbsences1795463230262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "absences" ADD "minutes" integer`);
    await queryRunner.query(
      `ALTER TABLE "absences" ADD CONSTRAINT "CHK_fea7722be6c3a74a777ced82d7" CHECK ("minutes" IS NULL OR ("minutes" > 0 AND "start_date" = "end_date"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "absences" DROP CONSTRAINT "CHK_fea7722be6c3a74a777ced82d7"`,
    );
    await queryRunner.query(`ALTER TABLE "absences" DROP COLUMN "minutes"`);
  }
}
