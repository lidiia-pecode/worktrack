import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  MoreThan,
  Repository,
} from 'typeorm';
import { UpdateUserPayload } from './dtos/user-payload.dto';
import { UpdateProfilePayload } from './dtos/update-profile-payload.dto';
import { User } from './entities/user.entity';
import { UserInactivePeriod } from './entities/user-inactive-period.entity';
import { UsersQuery } from './dtos/users-query.dto';
import { AssignableUsersQuery } from './dtos/assignable-users-query.dto';
import { UserRole, UserStatus } from './enums/user-role.enum';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { AuthSession } from 'src/auth/entities/auth-session.entity';
import { CapacityService } from 'src/capacity/capacity.service';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { andWhereAnyContains } from 'src/lib/utils/contains-text.util';
import { Team } from 'src/teams/entities/team.entity';
import { pageOffset } from 'src/lib/dtos/pagination-query.dto';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { Absence } from 'src/absences/entities/absence.entity';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import { ReportingService } from 'src/reporting/reporting.service';
import {
  addDays,
  isoDateIn,
  todayISODate,
} from 'src/capacity/working-days.util';
import { DeactivationImpactResponse } from './dtos/user-dates.dto';

type UserTeam = Pick<Team, 'id' | 'name'>;

interface RemovedTimeRaw {
  entryCount: string;
  minutes: string;
  firstDate: string | null;
  lastDate: string | null;
}

interface RemovedPlansRaw {
  projectId: string;
  projectName: string;
  planCount: string;
  firstDate: string;
  lastDate: string;
}

type UserTeamMembership = UserTeam &
  Pick<TeamMembership, 'roleInTeam' | 'joinedAt'>;

const PERSON_SEARCH_COLUMNS = [
  'u.first_name',
  'u.last_name',
  'u.email',
  'u.position',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly teamVisibility: TeamVisibilityService,
    private readonly dataSource: DataSource,
    private readonly capacity: CapacityService,
    private readonly reporting: ReportingService,
  ) {}

  private getRepository(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.repo;
  }

  private async safeSave(
    repo: Repository<User>,
    user: User,
    email?: string,
  ): Promise<User> {
    try {
      return await repo.save(user);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        const constraint = error.driverError.constraint;

        if (
          constraint?.includes('email') ||
          error.driverError.detail?.includes('email')
        ) {
          throw new ConflictException(
            `User with email ${email || user.email} already exists`,
          );
        }
        throw new ConflictException(
          'A user with these unique credentials already exists',
        );
      }
      throw error;
    }
  }

  async findByEmailWithCompany(
    email: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['company'],
    });
  }

  async findByGoogleIdWithCompany(
    googleId: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { googleId },
      relations: ['company'],
    });
  }

  async findUserByIdWithCompany(
    id: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { id },
      relations: ['company'],
    });
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepository(manager);
    const existingUser = await repo.findOne({
      where: { googleId },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException(
        'This Google account is already linked to another user',
      );
    }

    try {
      await repo.update({ id: userId }, { googleId });
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          'This Google account is already linked to another user',
        );
      }
      throw error;
    }
  }

  // Multi-Tenant Business API

  async list(
    companyId: string,
    query: UsersQuery,
    user: AuthUser,
    manager?: EntityManager,
  ) {
    const qb = this.getRepository(manager)
      .createQueryBuilder('u')
      .where('u.company_id = :companyId', { companyId })
      // Nobody manages the owner's account from this list.
      .andWhere('u.role != :owner', { owner: UserRole.OWNER })
      .loadRelationCountAndMap(
        'u.projectsCount',
        'u.projects',
        'project',
        (projects) =>
          projects.andWhere('project.status = :activeProject', {
            activeProject: ProjectStatus.ACTIVE,
          }),
      );

    if (query.status) {
      qb.andWhere('u.status = :status', { status: query.status });
    }

    if (query.search) {
      andWhereAnyContains(qb, PERSON_SEARCH_COLUMNS, query.search);
    }

    // The People list is about now.
    this.teamVisibility.applyUserVisibility(qb, 'u.id', user, {
      onDays: 'today',
    });

    const [users, count] = await qb
      .orderBy('u.created_at', 'DESC')
      .addOrderBy('u.id', 'DESC')
      .skip(pageOffset(query))
      .take(query.pageSize)
      .getManyAndCount();

    const userIds = users.map((listed) => listed.id);
    const [memberships, weeklyMinutesByUser] = await Promise.all([
      this.openMembershipsFor(companyId, userIds, user),
      user.role === UserRole.OWNER
        ? this.weeklyMinutesFor(companyId, userIds)
        : null,
    ]);

    const teamsByUser = new Map<string, UserTeam[]>();
    for (const { userId, team } of memberships) {
      const teams = teamsByUser.get(userId) ?? [];
      teams.push({ id: team.id, name: team.name });
      teamsByUser.set(userId, teams);
    }

    const results = users.map((listed) => ({
      ...listed,
      teams: teamsByUser.get(listed.id) ?? [],
      weeklyMinutes: weeklyMinutesByUser?.get(listed.id),
    }));

    return { results, count };
  }

  // Only teams the caller can see, so a manager learns no other team's name.
  private async openMembershipsFor(
    companyId: string,
    userIds: string[],
    caller: AuthUser,
  ): Promise<TeamMembership[]> {
    if (!userIds.length) return [];

    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(caller);
    if (visibleTeamIds?.length === 0) return [];

    return this.dataSource.getRepository(TeamMembership).find({
      where: {
        companyId,
        userId: In(userIds),
        leftAt: IsNull(),
        team: {
          status: TeamStatus.ACTIVE,
          ...(visibleTeamIds ? { id: In(visibleTeamIds) } : {}),
        },
      },
      relations: { team: true },
      order: { team: { name: 'ASC' } },
    });
  }

  private async weeklyMinutesFor(
    companyId: string,
    userIds: string[],
  ): Promise<Map<string, number>> {
    const today = await this.capacity.today(companyId);
    const timelines = await this.capacity.timelinesFor(
      companyId,
      userIds,
      today,
    );

    return new Map(
      userIds.map((id) => [id, timelines.get(id)!.minutesPerWeekOn(today)]),
    );
  }

  /**
   * The people the caller may put on a team or a project: everyone in the
   * company for an owner, a manager's own people plus the manager themselves.
   * Separate from `list` only because of that "plus themselves" — a manager
   * who leads no team must still be able to pick themselves.
   */
  async listAssignable(
    companyId: string,
    query: AssignableUsersQuery,
    user: AuthUser,
  ) {
    const qb = this.repo
      .createQueryBuilder('u')
      .where('u.company_id = :companyId', { companyId });

    if (query.status) {
      qb.andWhere('u.status = :status', { status: query.status });
    }

    if (query.roles?.length) {
      qb.andWhere('u.role IN (:...roles)', { roles: query.roles });
    }

    if (query.search) {
      andWhereAnyContains(qb, PERSON_SEARCH_COLUMNS, query.search);
    }

    // Who can be picked now.
    this.teamVisibility.applyUserVisibility(qb, 'u.id', user, {
      includeSelf: true,
      onDays: 'today',
    });

    const [users, count] = await qb
      .orderBy('u.first_name', 'ASC')
      .addOrderBy('u.last_name', 'ASC')
      .addOrderBy('u.id', 'ASC')
      .skip(pageOffset(query))
      .take(query.pageSize)
      .getManyAndCount();

    // The team each person is a member of, so a picker can say where a move
    // takes them from.
    const memberships = await this.openMembershipsFor(
      companyId,
      users.map((listed) => listed.id),
      user,
    );
    const memberTeamByUser = new Map<string, UserTeam>(
      memberships
        .filter((membership) => membership.roleInTeam === TeamRole.MEMBER)
        .map(({ userId, team }) => [userId, { id: team.id, name: team.name }]),
    );

    const results = users.map((listed) => ({
      ...listed,
      memberTeam: memberTeamByUser.get(listed.id) ?? null,
    }));

    return { results, count };
  }

  async findUserById(
    id: string,
    companyId?: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
    });
  }

  async getUserById(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<User & { hasPassword: boolean; googleLinked: boolean }> {
    const user = await this.findUserById(id, companyId, manager);
    if (!user) {
      throw new NotFoundException(
        `User with id ${id} not found in this company`,
      );
    }
    return {
      ...user,
      hasPassword: Boolean(user.passwordHash),
      googleLinked: Boolean(user.googleId),
    };
  }

  async getUserDetailsById(
    id: string,
    companyId: string,
    caller: AuthUser,
    manager?: EntityManager,
  ): Promise<
    User & {
      hasPassword: boolean;
      googleLinked: boolean;
      teams: UserTeamMembership[];
    }
  > {
    const user = await this.getRepository(manager).findOne({
      where: {
        id,
        companyId,
      },
      relations: {
        projects: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `User with id ${id} not found in this company`,
      );
    }

    if (
      caller.role === UserRole.MANAGER &&
      !(await this.teamVisibility.isUserInManagedTeams(id, caller))
    ) {
      throw new NotFoundException(
        `User with id ${id} not found in this company`,
      );
    }

    const memberships = await this.openMembershipsFor(companyId, [id], caller);

    return {
      ...user,
      hasPassword: Boolean(user.passwordHash),
      googleLinked: Boolean(user.googleId),
      teams: memberships.map(({ team, roleInTeam, joinedAt }) => ({
        id: team.id,
        name: team.name,
        roleInTeam,
        joinedAt,
      })),
    };
  }

  async findUsersByIds(
    ids: string[],
    companyId: string,
    manager?: EntityManager,
  ): Promise<User[]> {
    const uniqueIds = Array.from(new Set(ids));
    if (!uniqueIds.length) return [];

    const users = await this.getRepository(manager).find({
      where: {
        id: In(uniqueIds),
        companyId,
        status: UserStatus.ACTIVE,
      },
    });

    if (users.length !== uniqueIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Users not found, inactive, or belong to another company: ${missingIds.join(', ')}`,
      );
    }

    return users;
  }

  async findActiveOnlyMany(
    ids: string[],
    companyId: string,
    manager?: EntityManager,
  ): Promise<User[]> {
    return this.findUsersByIds(ids, companyId, manager);
  }

  async createInvitedUser(
    payload: {
      companyId: string;
      email: string;
      role: UserRole;
      firstName: string;
      lastName: string;
      passwordHash?: string | null;
      googleId?: string | null;
    },
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);

      const user = repo.create({
        companyId: payload.companyId,
        email: payload.email.toLowerCase().trim(),
        role: payload.role,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        passwordHash: payload.passwordHash ?? null,
        status: UserStatus.ACTIVE,
        googleId: payload.googleId ?? null,
      });

      return this.safeSave(repo, user, payload.email);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  async updateUser(
    id: string,
    companyId: string,
    payload: UpdateUserPayload,
    caller: AuthUser,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (user.status === UserStatus.DEACTIVATED) {
        throw new BadRequestException(
          'Reactivate this person before changing their details.',
        );
      }

      // Otherwise the company could be left with no owner.
      if (
        user.id === caller.id &&
        payload.role !== undefined &&
        payload.role !== user.role
      ) {
        throw new ForbiddenException('You cannot change your own role');
      }

      // One owner per company; handing ownership over isn't supported yet.
      if (payload.role === UserRole.OWNER) {
        throw new ForbiddenException('A company has only one owner.');
      }

      if (payload.firstName !== undefined) user.firstName = payload.firstName;
      if (payload.lastName !== undefined) user.lastName = payload.lastName;
      if (payload.role !== undefined) {
        if (
          user.role === UserRole.MANAGER &&
          payload.role !== UserRole.MANAGER
        ) {
          await this.assertManagesNoTeam(user, man);
        }
        user.role = payload.role;
      }
      if (payload.position !== undefined) user.position = payload.position;

      return this.safeSave(repo, user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  /** Team memberships never change as a side effect of a role change. */
  private async assertManagesNoTeam(
    user: User,
    manager: EntityManager,
  ): Promise<void> {
    const managedTeams = await manager.getRepository(TeamMembership).find({
      where: {
        userId: user.id,
        companyId: user.companyId,
        roleInTeam: TeamRole.MANAGER,
        leftAt: IsNull(),
        team: { status: TeamStatus.ACTIVE },
      },
      relations: ['team'],
      order: { team: { name: 'ASC' } },
    });

    if (managedTeams.length > 0) {
      const teamNames = managedTeams
        .map((membership) => membership.team.name)
        .join(', ');
      throw new BadRequestException(
        `This person manages ${teamNames}. Remove them as manager before changing their role.`,
      );
    }
  }

  async updateProfile(
    id: string,
    companyId: string,
    payload: UpdateProfilePayload,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (payload.firstName !== undefined) user.firstName = payload.firstName;
      if (payload.lastName !== undefined) user.lastName = payload.lastName;
      if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl;

      return this.safeSave(repo, user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  async updatePassword(
    id: string,
    companyId: string,
    passwordHash: string,
    manager?: EntityManager,
  ): Promise<void> {
    const execute = async (man: EntityManager): Promise<void> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);
      user.passwordHash = passwordHash;
      await repo.save(user);
    };

    if (manager) {
      await execute(manager);
    } else {
      await this.dataSource.transaction(execute);
    }
  }

  /**
   * Deactivates someone after their last working day. Everything recorded
   * after that day goes in the same transaction: time, plans, absences that
   * start later, and the part of one that runs past it.
   */
  async archive(
    id: string,
    currentUserId: string,
    companyId: string,
    lastWorkingDay: string,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      if (id === currentUserId) {
        throw new BadRequestException('You cannot archive your own account');
      }

      const repo = this.getRepository(man);
      // The person first, as every write for them locks, so time saved for
      // them at the same moment waits and is then refused or removed.
      await this.lockUser(man, id, companyId);
      const user = await this.getUserById(id, companyId, man);

      if (user.role === UserRole.OWNER) {
        throw new ForbiddenException(
          'Company OWNER account cannot be archived',
        );
      }

      if (user.status === UserStatus.DEACTIVATED) {
        throw new BadRequestException('User is already archived');
      }

      await this.assertLastWorkingDay(man, user, lastWorkingDay);
      await this.removeRecordsAfter(man, user.id, companyId, lastWorkingDay, {
        actorId: currentUserId,
      });

      user.status = UserStatus.DEACTIVATED;
      user.deactivatedAt = new Date();
      user.lastWorkingDay = lastWorkingDay;
      const deactivated = await repo.save(user);

      // So a reactivated person signs in again rather than resuming an old session.
      await man.getRepository(AuthSession).delete({ userId: user.id });

      return deactivated;
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  /** What deactivating someone with this last working day would remove. */
  async deactivationImpact(
    id: string,
    companyId: string,
    lastWorkingDay: string,
  ): Promise<DeactivationImpactResponse> {
    await this.getUserById(id, companyId);
    const after = { companyId, userId: id, lastWorkingDay };

    const [time, absences, plans] = await Promise.all([
      this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'entryCount')
        .addSelect('COALESCE(SUM(t.minutes), 0)', 'minutes')
        .addSelect(`TO_CHAR(MIN(t.date), 'YYYY-MM-DD')`, 'firstDate')
        .addSelect(`TO_CHAR(MAX(t.date), 'YYYY-MM-DD')`, 'lastDate')
        .from(TimeLog, 't')
        .where('t.company_id = :companyId AND t.user_id = :userId', after)
        .andWhere('t.date > :lastWorkingDay', after)
        .getRawOne<RemovedTimeRaw>(),
      this.dataSource.getRepository(Absence).find({
        where: {
          companyId,
          userId: id,
          endDate: MoreThan(lastWorkingDay),
        },
        order: { startDate: 'ASC' },
      }),
      this.dataSource
        .createQueryBuilder()
        .select('p.id', 'projectId')
        .addSelect('p.name', 'projectName')
        .addSelect('COUNT(*)', 'planCount')
        .addSelect(`TO_CHAR(MIN(e.date), 'YYYY-MM-DD')`, 'firstDate')
        .addSelect(`TO_CHAR(MAX(e.date), 'YYYY-MM-DD')`, 'lastDate')
        .from(PlanningEntry, 'e')
        .innerJoin('e.project', 'p')
        .where('e.company_id = :companyId AND e.user_id = :userId', after)
        .andWhere('e.date > :lastWorkingDay', after)
        .groupBy('p.id')
        .addGroupBy('p.name')
        .orderBy('p.name', 'ASC')
        .getRawMany<RemovedPlansRaw>(),
    ]);

    return {
      time: {
        entryCount: Number(time?.entryCount ?? 0),
        minutes: Number(time?.minutes ?? 0),
        firstDate: time?.firstDate ?? null,
        lastDate: time?.lastDate ?? null,
      },
      absences: absences.map((absence) => ({
        id: absence.id,
        type: absence.type,
        startDate: absence.startDate,
        endDate: absence.endDate,
        isCut: absence.startDate <= lastWorkingDay,
      })),
      plans: plans.map((row) => ({ ...row, planCount: Number(row.planCount) })),
    };
  }

  /** Reactivates someone from their first day back; the days in between stay closed. */
  async unarchive(
    id: string,
    companyId: string,
    firstDayBack: string,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      // So two reactivations at once can't both record the spell.
      await this.lockUser(man, id, companyId);
      const user = await this.getUserById(id, companyId, man);

      if (user.status === UserStatus.ACTIVE) {
        throw new BadRequestException('User is already active');
      }

      await this.assertFirstDayBack(man, user, firstDayBack);

      // Back the day after their last working day: no days were missed.
      const missedDays =
        user.lastWorkingDay && firstDayBack > addDays(user.lastWorkingDay, 1);
      if (missedDays) {
        await man.save(
          man.create(UserInactivePeriod, {
            companyId,
            userId: user.id,
            deactivatedAt: user.deactivatedAt ?? new Date(),
            reactivatedAt: new Date(),
            lastWorkingDay: user.lastWorkingDay!,
            firstDayBack,
          }),
        );
      }

      user.status = UserStatus.ACTIVE;
      user.deactivatedAt = null;
      user.lastWorkingDay = null;
      return repo.save(user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  private async lockUser(
    man: EntityManager,
    id: string,
    companyId: string,
  ): Promise<void> {
    await this.getRepository(man).findOne({
      where: { id, companyId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /**
   * Today or earlier, not before they joined or last came back, and the day
   * after it in an open month, so nothing in a locked month changes.
   */
  private async assertLastWorkingDay(
    man: EntityManager,
    user: User,
    lastWorkingDay: string,
  ): Promise<void> {
    const { timezone } = await this.capacity.calendarFor(user.companyId);
    const today = todayISODate(timezone);
    const joinedOn = isoDateIn(user.createdAt, timezone);

    if (lastWorkingDay > today) {
      throw new BadRequestException(
        'The last working day cannot be after today.',
      );
    }
    if (lastWorkingDay < joinedOn) {
      throw new BadRequestException(
        `The last working day cannot be before they joined, on ${joinedOn}.`,
      );
    }

    const lastSpell = await man.getRepository(UserInactivePeriod).findOne({
      where: { companyId: user.companyId, userId: user.id },
      order: { firstDayBack: 'DESC' },
    });
    if (lastSpell && lastWorkingDay < lastSpell.firstDayBack) {
      throw new BadRequestException(
        `The last working day cannot be before they came back, on ${lastSpell.firstDayBack}.`,
      );
    }

    await this.assertAfterLockedMonths(
      man,
      user.companyId,
      addDays(lastWorkingDay, 1),
      'The day after the last working day',
    );
  }

  /** Today or earlier, after their last working day, in an open month. */
  private async assertFirstDayBack(
    man: EntityManager,
    user: User,
    firstDayBack: string,
  ): Promise<void> {
    const { timezone } = await this.capacity.calendarFor(user.companyId);

    if (firstDayBack > todayISODate(timezone)) {
      throw new BadRequestException(
        'The first day back cannot be after today.',
      );
    }
    if (user.lastWorkingDay && firstDayBack <= user.lastWorkingDay) {
      throw new BadRequestException(
        `The first day back must be after their last working day, ${user.lastWorkingDay}.`,
      );
    }

    await this.assertAfterLockedMonths(
      man,
      user.companyId,
      firstDayBack,
      'The first day back',
    );
  }

  /** The first day a change affects must be in an open month. */
  private async assertAfterLockedMonths(
    man: EntityManager,
    companyId: string,
    firstAffectedDay: string,
    subject: string,
  ): Promise<void> {
    const lockedUntil = await this.reporting.latestLockedDate(companyId, man);

    if (firstAffectedDay <= lockedUntil) {
      throw new ForbiddenException(
        `${subject} is in a locked month: periods are LOCKED up to ${lockedUntil}.`,
      );
    }
  }

  /** Nothing stays recorded after the last working day. */
  private async removeRecordsAfter(
    man: EntityManager,
    userId: string,
    companyId: string,
    lastWorkingDay: string,
    { actorId }: { actorId: string },
  ): Promise<void> {
    const after = { companyId, userId, lastWorkingDay };
    const forThePerson = 'company_id = :companyId AND user_id = :userId';

    for (const entity of [TimeLog, PlanningEntry]) {
      await man
        .createQueryBuilder()
        .delete()
        .from(entity)
        .where(forThePerson, after)
        .andWhere('date > :lastWorkingDay', after)
        .execute();
    }

    await man
      .createQueryBuilder()
      .delete()
      .from(Absence)
      .where(forThePerson, after)
      .andWhere('start_date > :lastWorkingDay', after)
      .execute();
    await man
      .createQueryBuilder()
      .update(Absence)
      .set({ endDate: lastWorkingDay, updatedById: actorId })
      .where(forThePerson, after)
      .andWhere('end_date > :lastWorkingDay', after)
      .execute();
  }
}
