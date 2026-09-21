import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import { TeamMembership } from './entities/team-membership.entity';
import { TeamRole } from './enums/team-role.enum';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

/** Wording for the refusal, e.g. `{ action: 'view', subject: 'time logs' }`. */
export interface UserScopeWording {
  action: string;
  subject: string;
}

interface VisibilityOptions {
  /**
   * Also let the caller through for themselves. Assignment needs this: a
   * manager who leads no team sees nobody, but may always pick themselves.
   */
  includeSelf?: boolean;
}

/**
 * The single place that answers "whose data may this person read", so time
 * logs, planning and reporting can never disagree about it.
 */
@Injectable()
export class TeamVisibilityService {
  constructor(
    @InjectRepository(TeamMembership)
    private readonly repo: Repository<TeamMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
    options: VisibilityOptions = {},
  ): void {
    if (user.role === UserRole.OWNER) return;

    if (user.role === UserRole.MANAGER) {
      const managedTeams = `${userColumn} IN (
          SELECT tm_member.user_id
          FROM team_memberships tm_mgr
          JOIN team_memberships tm_member ON tm_member.team_id = tm_mgr.team_id
          WHERE tm_mgr.user_id = :visibilityUserId
            AND tm_mgr.role_in_team = :visibilityManagerRole
            AND tm_mgr.left_at IS NULL
            AND tm_member.left_at IS NULL
            AND tm_mgr.company_id = :visibilityCompanyId
            AND tm_member.company_id = :visibilityCompanyId
        )`;

      qb.andWhere(
        options.includeSelf
          ? `(${managedTeams} OR ${userColumn} = :visibilityUserId)`
          : managedTeams,
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
   * Of the given user ids, the ones the caller may see. Same rule as
   * `applyUserVisibility`, for callers holding a list of ids rather than a
   * query.
   */
  async filterVisibleUserIds(
    userIds: string[],
    user: AuthUser,
    options: VisibilityOptions = {},
  ): Promise<Set<string>> {
    const uniqueIds = Array.from(new Set(userIds));
    if (!uniqueIds.length) return new Set();

    if (user.role === UserRole.OWNER) return new Set(uniqueIds);

    const includesSelf = uniqueIds.includes(user.id);

    if (user.role !== UserRole.MANAGER) {
      return new Set(includesSelf ? [user.id] : []);
    }

    const self = options.includeSelf && includesSelf ? [user.id] : [];

    const qb = this.repo
      .createQueryBuilder('tm')
      .select('DISTINCT tm.user_id', 'userId')
      .where('tm.user_id IN (:...scopeUserIds)', { scopeUserIds: uniqueIds })
      .andWhere('tm.company_id = :scopeCompanyId', {
        scopeCompanyId: user.companyId,
      })
      .andWhere('tm.left_at IS NULL');

    this.applyUserVisibility(qb, 'tm.user_id', user);

    const rows = await qb.getRawMany<{ userId: string }>();

    return new Set([...self, ...rows.map((row) => row.userId)]);
  }

  /**
   * Refuses the caller when the target user is outside their scope: an owner
   * may act for anyone in their company, a manager for the people in the teams
   * they lead, anyone else only for themselves.
   */
  async assertCanActForUser(
    userId: string,
    user: AuthUser,
    wording: UserScopeWording,
  ): Promise<void> {
    if (user.role === UserRole.OWNER) {
      const exists = await this.userRepo.exists({
        where: { id: userId, companyId: user.companyId },
      });
      if (!exists) throw new NotFoundException('User not found');
      return;
    }

    if (user.role === UserRole.MANAGER) {
      if (await this.isUserInManagedTeams(userId, user)) return;

      throw new ForbiddenException(
        `You can only ${wording.action} ${wording.subject} of users in teams you manage`,
      );
    }

    if (userId !== user.id) {
      throw new ForbiddenException(
        `You can only ${wording.action} your own ${wording.subject}`,
      );
    }
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
