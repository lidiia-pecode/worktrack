import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordWhoChangedTimeAndAbsences1793618451597 implements MigrationInterface {
  name = 'RecordWhoChangedTimeAndAbsences1793618451597';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "time_logs" ADD "created_by_id" uuid`);
    await queryRunner.query(`ALTER TABLE "time_logs" ADD "updated_by_id" uuid`);
    await queryRunner.query(`ALTER TABLE "absences" ADD "created_by_id" uuid`);
    await queryRunner.query(`ALTER TABLE "absences" ADD "updated_by_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "time_logs" ADD CONSTRAINT "FK_725906687453cf1bdb6f9c861d2" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" ADD CONSTRAINT "FK_52cab050fbdfce5dba4fdfbfa0b" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "absences" ADD CONSTRAINT "FK_6842b2e5de80f1a91ad50c1ed0d" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "absences" ADD CONSTRAINT "FK_a17bef910d4d48c46559b522e2a" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "absences" DROP CONSTRAINT "FK_a17bef910d4d48c46559b522e2a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "absences" DROP CONSTRAINT "FK_6842b2e5de80f1a91ad50c1ed0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP CONSTRAINT "FK_52cab050fbdfce5dba4fdfbfa0b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP CONSTRAINT "FK_725906687453cf1bdb6f9c861d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "absences" DROP COLUMN "updated_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "absences" DROP COLUMN "created_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP COLUMN "updated_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP COLUMN "created_by_id"`,
    );
  }
}
