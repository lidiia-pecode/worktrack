import { reviewMigrationSource } from './migration-risk';

const migration = (up: string, down = '') => `
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Example1792853860111 implements MigrationInterface {
  name = 'Example1792853860111';

  public async up(queryRunner: QueryRunner): Promise<void> {
    ${up}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    ${down}
  }
}
`;

describe('reviewMigrationSource', () => {
  it('reads the statements of up() in order, and none of down()', () => {
    const review = reviewMigrationSource(
      migration(
        'await queryRunner.query(`ALTER TABLE "users" ADD "deactivated_at" TIMESTAMP WITH TIME ZONE`);\n' +
          'await queryRunner.query(`CREATE INDEX "IDX_a" ON "users" ("deactivated_at")`);',
        'await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deactivated_at"`);',
      ),
    );

    expect(review.statements).toEqual([
      'ALTER TABLE "users" ADD "deactivated_at" TIMESTAMP WITH TIME ZONE',
      'CREATE INDEX "IDX_a" ON "users" ("deactivated_at")',
    ]);
    expect(review).toMatchObject({ risk: 'additive', reasons: [] });
  });

  it('calls a new nullable column, table, index or enum label additive', () => {
    const review = reviewMigrationSource(
      migration(
        'await queryRunner.query(`CREATE TABLE "absences" ("id" uuid NOT NULL)`);\n' +
          'await queryRunner.query(`ALTER TYPE "absence_type_enum" ADD VALUE \'UNPAID\'`);',
      ),
    );

    expect(review.risk).toBe('additive');
  });

  it.each([
    [
      'ALTER TABLE "users" DROP COLUMN "username"',
      'drops a table, column, index or constraint',
    ],
    [
      'DROP INDEX "public"."UQ_users_username"',
      'drops a table, column, index or constraint',
    ],
    [
      'ALTER TABLE "users" RENAME COLUMN "name" TO "first_name"',
      'renames something the running code still names',
    ],
    [
      'ALTER TABLE "time_logs" ALTER COLUMN "minutes" TYPE smallint',
      "changes a column's type",
    ],
    [
      'ALTER TABLE "absences" ALTER COLUMN "user_id" SET NOT NULL',
      'makes an existing column NOT NULL',
    ],
    ['TRUNCATE "notifications"', 'empties a table'],
  ])('calls %s destructive', (sql, reason) => {
    const review = reviewMigrationSource(
      migration(`await queryRunner.query(\`${sql}\`);`),
    );

    expect(review.risk).toBe('destructive');
    expect(review.reasons).toEqual([reason]);
  });

  it('calls a change to rows data-only, and says what it does to them', () => {
    const review = reviewMigrationSource(
      migration(
        'await queryRunner.query(`UPDATE "time_logs" SET "is_billable" = false WHERE "project_id" IS NULL`);\n' +
          'await queryRunner.query(`DELETE FROM "planning_entries" WHERE EXTRACT(ISODOW FROM "date") IN (6, 7)`);',
      ),
    );

    expect(review.risk).toBe('data');
    expect(review.reasons).toEqual(['changes existing rows', 'deletes rows']);
  });

  it('is destructive as soon as one statement is, whatever the others do', () => {
    const review = reviewMigrationSource(
      migration(
        'await queryRunner.query(`ALTER TABLE "users" ADD "x" integer`);\n' +
          'await queryRunner.query(`UPDATE "users" SET "x" = 0`);\n' +
          'await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "x" SET NOT NULL`);',
      ),
    );

    expect(review.risk).toBe('destructive');
    expect(review.reasons).toContain('makes an existing column NOT NULL');
    expect(review.reasons).toContain('changes existing rows');
  });

  it('refuses to wave through SQL it cannot read', () => {
    const review = reviewMigrationSource(
      migration('await queryRunner.query(statements.join(";"));'),
    );

    expect(review.statements).toEqual([]);
    expect(review.risk).toBe('destructive');
    expect(review.reasons).toEqual([
      'runs SQL this review could not read; check the file by hand',
    ]);
  });

  it('calls an empty up() additive, with nothing to run', () => {
    expect(reviewMigrationSource(migration(''))).toEqual({
      risk: 'additive',
      statements: [],
      reasons: [],
    });
  });
});
