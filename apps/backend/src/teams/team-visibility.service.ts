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
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { formatDay } from 'src/lib/utils/format-day.util';
import type { AuthUser } from 'src/auth/auth-strategies/types';

/** Wording for the refusal, e.g. `{ action: 'view', subject: 'time logs' }`. */
export interface UserScopeWording {
  action: string;
  subject: string;
}

/** Days from `from` to `to`, both included; one day when `to` is left out. */
export interface DayRange {
  from: string;
  to?: string;
}

/**
 * The people a manager reaches and the days they reach them on: one row per
 * membership in a team the manager leads now, covering `joined_at` up to the
 * day before `left_at`, so the day someone moves belongs to their new team.
 * Every manager check reads these rows, so another source of reach is one
 * more set of rows here.
 */
const MANAGED_REACH_SQL = `
  SELECT tm_member.user_id AS user_id,
    tm_member.joined_at AS reach_from,
    tm_member.left_at AS reach_to
  FROM team_memberships tm_mgr
  JOIN team_memberships tm_member ON tm_member.team_id = tm_mgr.team_id
  WHERE tm_mgr.user_id = :reachCallerId
    AND tm_mgr.role_in_team = :reachManagerRole
    AND tm_mgr.left_at IS NULL
    AND tm_mgr.company_id = :reachCompanyId
    AND tm_member.company_id = :reachCompanyId`;

interface ReachSpan {
  from: string;
  /** The first day no longer reached; open while the membership is. */
  to: string | null;
}

export type VisibleUser = Pick<
  User,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'position'
  | 'avatarUrl'
  | 'status'
  | 'deactivatedAt'
  | 'role'
>;

export interface VisibleUsersFilter {
  teamId?: string;
  projectId?: string;
  userId?: string;
  /**
   * People with data in the view: listed even when deactivated, or no longer
   * on the filtered project.
   */
  includeUserIds?: string[];
  /**
   * Also the deactivated people who still had days to work in the view: they
   * left after its first day, where the company is.
   */
  leftAfter?: { date: string; timezone: string };
}

interface VisibilityOptions {
  /**
   * Also let the caller through for themselves, so a manager who leads no
   * team can still read their own data and pick themselves.
   */
  includeSelf?: boolean;
  /**
   * The record's days, as SQL: a manager reaches it on any of them. Without
   * it, a manager reaches the people in their teams today.
   */
  onDays?: { startColumn: string; endColumn?: string };
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
   * in the company, a manager the members of the teams they lead now (on the
   * record's days, when `onDays` names them), and anyone else only
   * themselves.
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
      const { onDays } = options;
      const onReachedDays = onDays
        ? `reach.reach_from <= ${onDays.endColumn ?? onDays.startColumn}
            AND (reach.reach_to IS NULL OR ${onDays.startColumn} < reach.reach_to)`
        : 'reach.reach_to IS NULL';
      const reached = `EXISTS (
          SELECT 1 FROM (${MANAGED_REACH_SQL}) reach
          WHERE reach.user_id = ${userColumn}
            AND ${onReachedDays}
        )`;

      qb.andWhere(
        options.includeSelf
          ? `(${reached} OR ${userColumn} = :reachCallerId)`
          : reached,
        this.reachParameters(user),
      );
      return;
    }

    qb.andWhere(`${userColumn} = :reachCallerId`, {
      reachCallerId: user.id,
    });
  }

  /**
   * Of the given user ids, the ones the caller may see. Same rule as
   * `applyUserVisibility`, for callers holding a list of ids rather than a
   * query — including its convention that tenant scoping stays with the
   * caller, so an owner gets every id back untouched.
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
   * Refuses the caller when they may read none of the person's records: an
   * owner reads anyone in their company, a manager the people in the teams
   * they lead, on the days they were in them, anyone else only themselves.
   * Which records, by day, is for the query to narrow (`onDays`).
   */
  async assertCanReadUser(
    userId: string,
    user: AuthUser,
    wording: UserScopeWording,
  ): Promise<void> {
    if (await this.isOwnOrOwnerOf(userId, user)) return;

    if (
      user.role === UserRole.MANAGER &&
      (await this.reachSpans(userId, user)).length > 0
    ) {
      return;
    }

    throw outOfScope(user, wording);
  }

  /**
   * Refuses the caller unless they may write the person's records on every
   * day of the range: an owner for anyone in their company, a manager on the
   * days the person was in a team they lead, anyone else only for themselves.
   */
  async assertCanWriteUser(
    userId: string,
    user: AuthUser,
    wording: UserScopeWording,
    range: DayRange,
  ): Promise<void> {
    if (await this.isOwnOrOwnerOf(userId, user)) return;

    const spans =
      user.role === UserRole.MANAGER ? await this.reachSpans(userId, user) : [];

    // Someone the manager reaches on other days is named with the day missed;
    // anyone else is refused without saying who they are.
    if (spans.length > 0) {
      const firstMissed = firstDayNotCovered(spans, range);
      if (firstMissed === null) return;

      const person = await this.userRepo.findOne({
        select: ['id', 'firstName', 'lastName'],
        where: { id: userId, companyId: user.companyId },
      });
      if (!person) throw new NotFoundException('User not found');

      throw new ForbiddenException(
        `You can't ${wording.action} ${wording.subject} here: ${person.firstName} ${person.lastName} isn't in a team you lead on ${formatDay(firstMissed)}`,
      );
    }

    throw outOfScope(user, wording);
  }

  /**
   * True for the caller themselves and for an owner acting on someone in
   * their company; an owner naming nobody in it is refused as not found.
   */
  private async isOwnOrOwnerOf(
    userId: string,
    user: AuthUser,
  ): Promise<boolean> {
    if (userId === user.id) return true;
    if (user.role !== UserRole.OWNER) return false;

    const exists = await this.userRepo.exists({
      where: { id: userId, companyId: user.companyId },
    });
    if (!exists) throw new NotFoundException('User not found');
    return true;
  }

  /**
   * The days the manager reaches the person on, as `MANAGED_REACH_SQL` rows,
   * with the days as text so they compare as the rest of the app's do.
   */
  private reachSpans(userId: string, user: AuthUser): Promise<ReachSpan[]> {
    return this.repo.manager
      .createQueryBuilder()
      .select([
        `to_char(reach.reach_from, 'YYYY-MM-DD') AS "from"`,
        `to_char(reach.reach_to, 'YYYY-MM-DD') AS "to"`,
      ])
      .from(`(${MANAGED_REACH_SQL})`, 'reach')
      .where('reach.user_id = :reachUserId', { reachUserId: userId })
      .setParameters(this.reachParameters(user))
      .getRawMany<ReachSpan>();
  }

  private reachParameters(user: AuthUser) {
    return {
      reachCallerId: user.id,
      reachManagerRole: TeamRole.MANAGER,
      reachCompanyId: user.companyId,
    };
  }

  /**
   * The people a week view lists: everyone the caller may see who is active,
   * plus the deactivated ones named in `includeUserIds`.
   */
  async findVisibleUsers(
    user: AuthUser,
    filter: VisibleUsersFilter = {},
    options: VisibilityOptions = {},
  ): Promise<VisibleUser[]> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.firstName',
        'u.lastName',
        'u.email',
        'u.position',
        'u.avatarUrl',
        'u.status',
        'u.deactivatedAt',
        'u.role',
      ])
      .where('u.company_id = :companyId', { companyId: user.companyId });

    this.applyUserVisibility(qb, 'u.id', user, options);
    this.applyTeamMembershipFilter(qb, 'u.id', filter.teamId, user);

    if (filter.userId) {
      qb.andWhere('u.id = :visibleUserId', { visibleUserId: filter.userId });
    }

    const hasIncludedUsers = Boolean(filter.includeUserIds?.length);
    if (hasIncludedUsers) {
      qb.setParameter('includeUserIds', filter.includeUserIds);
    }

    // A project's past keeps the people removed from it since: they are
    // listed while they have data in the view.
    if (filter.projectId) {
      const onProject = `EXISTS (
          SELECT 1
          FROM project_users pu
          WHERE pu.project_id = :visibleProjectId
            AND pu.user_id = u.id
        )`;
      qb.andWhere(
        hasIncludedUsers
          ? `(${onProject} OR u.id IN (:...includeUserIds))`
          : onProject,
        { visibleProjectId: filter.projectId },
      );
    }

    // Deactivated people are listed only with a reason: they are named, or
    // they were still employed on the view's first day.
    const alsoListed: string[] = [];
    if (hasIncludedUsers) {
      alsoListed.push('u.id IN (:...includeUserIds)');
    }
    if (filter.leftAfter) {
      alsoListed.push(
        '(u.deactivated_at AT TIME ZONE :leftAfterTimezone)::date > :leftAfter',
      );
      qb.setParameters({
        leftAfter: filter.leftAfter.date,
        leftAfterTimezone: filter.leftAfter.timezone,
      });
    }
    qb.andWhere(
      alsoListed.length
        ? `(u.status = :activeStatus OR ${alsoListed.join(' OR ')})`
        : 'u.status = :activeStatus',
      { activeStatus: UserStatus.ACTIVE },
    );

    return qb
      .orderBy('u.firstName', 'ASC')
      .addOrderBy('u.lastName', 'ASC')
      .addOrderBy('u.id', 'ASC')
      .getMany();
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
    const spans = await this.reachSpans(userId, user);
    return spans.some((span) => span.to === null);
  }
}

/** The refusal for somebody wholly outside the caller's scope. */
const outOfScope = (user: AuthUser, wording: UserScopeWording) =>
  new ForbiddenException(
    user.role === UserRole.MANAGER
      ? `You can only ${wording.action} ${wording.subject} of users in teams you manage`
      : `You can only ${wording.action} your own ${wording.subject}`,
  );

/**
 * The first day of the range the spans leave out, or null when they cover it
 * all. Spans may overlap or leave gaps, as memberships of several teams do.
 */
const firstDayNotCovered = (
  spans: ReachSpan[],
  range: DayRange,
): string | null => {
  const lastDay = range.to ?? range.from;
  const sorted = [...spans].sort((a, b) => a.from.localeCompare(b.from));
  let nextDay = range.from;

  for (const span of sorted) {
    if (span.from > nextDay) break;
    if (span.to === null) return null;
    if (span.to > nextDay) nextDay = span.to;
    if (nextDay > lastDay) return null;
  }

  return nextDay;
};
