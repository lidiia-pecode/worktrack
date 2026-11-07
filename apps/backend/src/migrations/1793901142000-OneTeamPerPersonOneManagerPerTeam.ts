import { MigrationInterface, QueryRunner } from 'typeorm';

export class OneTeamPerPersonOneManagerPerTeam1793901142000 implements MigrationInterface {
  name = 'OneTeamPerPersonOneManagerPerTeam1793901142000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_team_memberships_open_per_user" ON "team_memberships" ("user_id") WHERE "left_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_team_memberships_open_manager_per_team" ON "team_memberships" ("team_id") WHERE "role_in_team" = 'MANAGER' AND "left_at" IS NULL`,
    );
    // Redundant once a person holds one open membership at most.
    await queryRunner.query(
      `DROP INDEX "public"."UQ_team_memberships_active_user"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_team_memberships_active_user" ON "team_memberships" ("team_id", "user_id") WHERE "left_at" IS NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_team_memberships_open_manager_per_team"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_team_memberships_open_per_user"`,
    );
  }
}
