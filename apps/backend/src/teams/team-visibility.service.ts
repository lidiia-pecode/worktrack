import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import { TeamMembership } from './entities/team-membership.entity';
import { TeamRole } from './enums/team-role.enum';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

/**
 * The single place that answers "whose data may this person read", so time
 * logs, planning and reporting can never disagree about it.
 */
@Injectable()
export class TeamVisibilityService {
  constructor(
    @InjectRepository(TeamMembership)
    private readonly repo: Repository<TeamMembership>,
  ) {}

  /**
   * Narrows a query to the users the caller may read: an owner sees everyone
   * in the company, a manager sees the members of the teams they currently
   * lead, and anyone else sees only themselves.
   *
   * `userColumn` is the column holding the owning user, e.g. `t.user_id`.
   * Tenant scoping stays with the caller — this only filters by user.
   */
  applyUserVisibility<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    userColumn: string,
    user: AuthUser,
  ): void {
    if (user.role === UserRole.OWNER) return;

    if (user.role === UserRole.MANAGER) {
      qb.andWhere(
        `${userColumn} IN (
          SELECT tm_member.user_id
          FROM team_memberships tm_mgr
          JOIN team_memberships tm_member ON tm_member.team_id = tm_mgr.team_id
          WHERE tm_mgr.user_id = :visibilityUserId
            AND tm_mgr.role_in_team = :visibilityManagerRole
            AND tm_mgr.left_at IS NULL
            AND tm_member.left_at IS NULL
            AND tm_mgr.company_id = :visibilityCompanyId
            AND tm_member.company_id = :visibilityCompanyId
        )`,
        {
          visibilityUserId: user.id,
          visibilityManagerRole: TeamRole.MANAGER,
          visibilityCompanyId: user.companyId,
        },
      );
      return;
    }

    qb.andWhere(`${userColumn} = :visibilityUserId`, {
      visibilityUserId: user.id,
    });
  }

  /**
   * Filters the query to users who are currently members of the given team.
   *
   * The caller's visibility scope is applied separately, so passing a team
   * the caller cannot access results in no matching users.
   */
  applyTeamMembershipFilter<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    userColumn: string,
    teamId: string | undefined,
    user: AuthUser,
  ): void {
    if (!teamId) return;

    qb.andWhere(
      `${userColumn} IN (
        SELECT tm_team.user_id
        FROM team_memberships tm_team
        WHERE tm_team.team_id = :teamFilterTeamId
          AND tm_team.left_at IS NULL
          AND tm_team.company_id = :teamFilterCompanyId
      )`,
      {
        teamFilterTeamId: teamId,
        teamFilterCompanyId: user.companyId,
      },
    );
  }

  /**
   * The teams the caller may see: every team for an owner, the teams they
   * actively lead for a manager. Returns ids so callers can keep their own
   * query shape.
   */
  async getVisibleTeamIds(user: AuthUser): Promise<string[] | null> {
    if (user.role === UserRole.OWNER) return null;

    const memberships = await this.repo.find({
      select: ['teamId'],
      where: {
        userId: user.id,
        companyId: user.companyId,
        roleInTeam: TeamRole.MANAGER,
        leftAt: IsNull(),
      },
    });

    return memberships.map((membership) => membership.teamId);
  }

  /** True when the caller currently leads a team the given user belongs to. */
  async isUserInManagedTeams(userId: string, user: AuthUser): Promise<boolean> {
    return this.repo
      .createQueryBuilder('tm_mgr')
      .innerJoin(
        TeamMembership,
        'tm_member',
        'tm_member.team_id = tm_mgr.team_id',
      )
      .where('tm_mgr.user_id = :managerId', { managerId: user.id })
      .andWhere('tm_mgr.role_in_team = :managerRole', {
        managerRole: TeamRole.MANAGER,
      })
      .andWhere('tm_mgr.left_at IS NULL')
      .andWhere('tm_member.user_id = :userId', { userId })
      .andWhere('tm_member.left_at IS NULL')
      .andWhere('tm_mgr.company_id = :companyId', { companyId: user.companyId })
      .andWhere('tm_member.company_id = :companyId')
      .getExists();
  }
}
