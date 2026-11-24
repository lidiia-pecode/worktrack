import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
  WhereExpressionBuilder,
} from 'typeorm';

import { PlanningEntry } from './entities/planning-entry.entity';
import { PlanningQueryDto } from './dtos/planning-query.dto';
import { PlanningPeriodQuery } from './dtos/planning-period-query.dto';
import { PlanningRemovalCountQuery } from './dtos/planning-removal-count-query.dto';
import {
  DeletePeriodPlansQuery,
  PlanPeriodPayload,
} from './dtos/plan-period-payload.dto';
import {
  PeriodLine,
  PeriodProblem,
  PeriodWeek,
  PeriodWrites,
  describePeriodProblem,
  periodProblems,
  periodWrites,
} from './planning-period.util';
import { Company } from 'src/companies/entities/company.entity';
import { formatDay } from 'src/lib/utils/format-day.util';
import {
  ClosedSpell,
  DaySpan,
  TeamMove,
  beforeAccountIn,
  closedSpellsIn,
  isWithinSpan,
} from 'src/teams/days-in-view.util';
import { Project } from 'src/projects/entities/project.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import {
  TeamVisibilityService,
  VisibleUser,
} from 'src/teams/team-visibility.service';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { lockUser } from 'src/users/lock-user.util';
import { PeriodLocksService } from 'src/reporting/period-locks.service';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import { CapacityService } from 'src/capacity/capacity.service';
import {
  addDays,
  eachDate,
  isWorkingDay,
  todayISODate,
  weekRange,
} from 'src/capacity/working-days.util';
import { assertDateRange } from 'src/reporting/date-range.util';
import {
  firstDayOfMonth,
  lastDayOfMonth,
} from 'src/reporting/reporting-months.util';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { pageOffset } from 'src/lib/dtos/pagination-query.dto';

type PlanningCompany = Pick<Company, 'id' | 'timezone' | 'weekStartDay'>;

export interface PlanningRow {
  user: VisibleUser;
  plannedMinutes: number;
  availableMinutes: number;
  /** `availableMinutes` day by day, so a month can be summed by week. */
  availableByDay: { date: string; minutes: number }[];
  /** The most the person can be planned on each day. */
  dayLimits: { date: string; minutes: number }[];
  projects: Pick<Project, 'id' | 'name'>[];
  entries: PlanningEntry[];
  /** The days the viewer can't touch in this row; see `TeamSummaryRow`. */
  closedSpells: ClosedSpell[];
  moves: TeamMove[];
}

export interface PlanningWeek {
  weekStart: string;
  weekEnd: string;
  rows: PlanningRow[];
}

export interface PlanningMonth {
  monthStart: string;
  monthEnd: string;
  rows: PlanningRow[];
}

export interface PlannedPeriod {
  /** The working days that were planned. */
  days: number;
  created: number;
  updated: number;
}

export interface PeriodPreview {
  /** The working days the plan would cover. */
  plannedDays: string[];
  /** Every day and week the plan would take over its limit. */
  problems: PeriodProblem[];
  /** How many plans saving would add and change, per listed project. */
  changes: { projectId: string; added: number; changed: number }[];
  /** The person's longest day in the period: the most one project can take. */
  dayLimitMinutes: number;
  /** Working days skipped because the person was in a team the caller doesn't lead. */
  daysInAnotherTeam: string[];
  /** Planned days the person is partly away, where the lines take only what is left. */
  partDays: PartDay[];
}

interface PartDay {
  date: string;
  absenceMinutes: number;
}

interface ResolvedPeriod {
  plannedDays: Set<string>;
  daysInAnotherTeam: string[];
  problems: PeriodProblem[];
  lines: PeriodLine[];
  writes: PeriodWrites;
  dayLimitMinutes: number;
  partDays: PartDay[];
}

const PLAN_WORDING = { action: 'change', subject: 'plans' };

/** Who can be planned how much on a day; see `dayLimitsFor`. */
type DayLimitOn = (userId: string, date: string) => number;

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(PlanningEntry)
    private readonly repo: Repository<PlanningEntry>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly teamVisibility: TeamVisibilityService,
    private readonly periodLocks: PeriodLocksService,
    private readonly expectedHours: ExpectedHoursService,
    private readonly capacity: CapacityService,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // QUERY BUILDING
  // ==========================================

  private buildBaseQuery(): SelectQueryBuilder<PlanningEntry> {
    return this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.project', 'project');
  }

  private applyTenantFilter(
    qb: SelectQueryBuilder<PlanningEntry>,
    companyId: string,
  ): void {
    qb.andWhere('p.company_id = :companyId', { companyId });
  }

  // Everyone may read their own plan, including a manager who leads no team.
  private applyVisibilityFilter(
    qb: SelectQueryBuilder<PlanningEntry>,
    user: AuthUser,
  ): void {
    this.applyTenantFilter(qb, user.companyId);
    this.teamVisibility.applyUserVisibility(qb, 'p.user_id', user, {
      includeSelf: true,
      onDays: { startColumn: 'p.date' },
    });
  }

  /**
   * Plans from today on that can no longer happen: a member's, when they leave
   * the project, or everyone's (no `userIds`), when it is archived.
   */
  private applyRemovableFilter(
    qb: WhereExpressionBuilder,
    alias: string,
    companyId: string,
    projectIds: string[],
    userIds: string[] | undefined,
    today: string,
  ): void {
    qb.andWhere(`${alias}.company_id = :removableCompanyId`, {
      removableCompanyId: companyId,
    }).andWhere(`${alias}.project_id IN (:...removableProjectIds)`, {
      removableProjectIds: projectIds,
    });
    if (userIds) {
      qb.andWhere(`${alias}.user_id IN (:...removableUserIds)`, {
        removableUserIds: userIds,
      });
    }
    qb.andWhere(`${alias}.date >= :removableFrom`, {
      removableFrom: today,
    }).andWhere(
      `EXISTS (
          SELECT 1 FROM project_users pu
          WHERE pu.project_id = ${alias}.project_id AND pu.user_id = ${alias}.user_id
        )`,
    );
  }

  // ==========================================
  // READ
  // ==========================================

  async list(
    query: PlanningQueryDto,
    user: AuthUser,
  ): Promise<{ results: PlanningEntry[]; count: number }> {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo');
    }

    const qb = this.buildBaseQuery();
    this.applyVisibilityFilter(qb, user);
    this.teamVisibility.applyTeamMembershipFilter(
      qb,
      'p.user_id',
      query.teamId,
      user,
      { startColumn: 'p.date' },
    );

    if (query.userId) {
      await this.teamVisibility.assertCanReadUser(query.userId, user, {
        action: 'view',
        subject: 'planning',
      });
      qb.andWhere('p.user_id = :userId', { userId: query.userId });
    }

    if (query.projectId) {
      qb.andWhere('project.id = :projectId', { projectId: query.projectId });
    }

    if (query.date) {
      qb.andWhere('p.date = :date', { date: query.date });
    } else {
      if (query.dateFrom) {
        qb.andWhere('p.date >= :from', { from: query.dateFrom });
      }
      if (query.dateTo) {
        qb.andWhere('p.date <= :to', { to: query.dateTo });
      }
    }

    const [results, count] = await qb
      .orderBy('p.date', 'DESC')
      .addOrderBy('p.createdAt', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .skip(pageOffset(query))
      .take(query.pageSize)
      .getManyAndCount();

    return { results, count };
  }

  async getWeek(
    query: PlanningPeriodQuery,
    user: AuthUser,
  ): Promise<PlanningWeek> {
    const company = await this.getCompany(user.companyId);
    const { start, end } = weekRange(query.date, company.weekStartDay);

    return {
      weekStart: start,
      weekEnd: end,
      rows: await this.readRows(company, user, start, end, query.teamId),
    };
  }

  /** The month that holds `query.date`, with the rows a week would have. */
  async getMonth(
    query: PlanningPeriodQuery,
    user: AuthUser,
  ): Promise<PlanningMonth> {
    const company = await this.getCompany(user.companyId);
    const start = firstDayOfMonth(query.date);
    const end = lastDayOfMonth(query.date);

    return {
      monthStart: start,
      monthEnd: end,
      rows: await this.readRows(company, user, start, end, query.teamId),
    };
  }

  /** One row per person the caller can plan or has plans for, over the days. */
  private async readRows(
    company: PlanningCompany,
    user: AuthUser,
    start: string,
    end: string,
    teamId: string | undefined,
  ): Promise<PlanningRow[]> {
    const entriesQb = this.buildBaseQuery()
      .andWhere('p.date BETWEEN :start AND :end', { start, end })
      .orderBy('project.name', 'ASC');
    this.applyVisibilityFilter(entriesQb, user);
    const entries = await entriesQb.getMany();

    const users = await this.teamVisibility.findVisibleUsers(
      user,
      {
        teamId,
        includeUserIds: [...new Set(entries.map((entry) => entry.userId))],
        stillEmployedOn: start,
        during: { from: start, to: end },
      },
      { includeSelf: true },
    );
    const userIds = users.map((row) => row.id);
    const period = { from: start, to: end };
    // A row holds only the days the view does, as on Team time.
    const inView = await this.teamVisibility.daysInView(
      user,
      userIds,
      period,
      teamId,
    );
    const outside = new Map(
      [...inView].map(([id, days]) => [id, days.outside]),
    );

    const [available, projectsByUser, dayLimitOn, activeDates] =
      await Promise.all([
        this.expectedHours.expectedFor(
          user.companyId,
          userIds,
          start,
          end,
          outside,
        ),
        this.activeProjectsFor(user.companyId, userIds),
        this.dayLimitsFor(company.id, userIds, start, end),
        this.capacity.activeDatesFor(user.companyId, userIds, company.timezone),
      ]);
    const dates = [...eachDate(start, end)];

    const rows = users.map((rowUser): PlanningRow => {
      const { outside: rowOutside, moves } = inView.get(rowUser.id)!;
      const own = entries.filter(
        (entry) =>
          entry.userId === rowUser.id &&
          !rowOutside.some((span) => isWithinSpan(span, entry.date)),
      );
      const expected = available.get(rowUser.id);
      const expectedOn = new Map(
        (expected?.byDate ?? []).map((day) => [day.date, day.minutes]),
      );

      return {
        user: rowUser,
        plannedMinutes: own.reduce((sum, e) => sum + e.plannedMinutes, 0),
        availableMinutes: expected?.total ?? 0,
        availableByDay: dates.map((date) => ({
          date,
          minutes: expectedOn.get(date) ?? 0,
        })),
        dayLimits: dates.map((date) => ({
          date,
          minutes: dayLimitOn(rowUser.id, date),
        })),
        projects: projectsByUser.get(rowUser.id) ?? [],
        entries: own,
        closedSpells: [
          ...closedSpellsIn(
            period,
            rowOutside,
            activeDates.get(rowUser.id)?.inactiveSpells ?? [],
          ),
          ...beforeAccountIn(period, activeDates.get(rowUser.id)?.startDate),
        ],
        moves,
      };
    });

    // Someone is planned only with working hours on a day the row holds them
    // and they were employed; a plan already there keeps them listed so it can
    // be deleted. Time off doesn't take the hours away, so the row stays.
    const isPlannable = (row: PlanningRow) =>
      row.dayLimits.some(
        ({ date, minutes }) =>
          minutes > 0 &&
          isWorkingDay(date) &&
          !row.closedSpells.some((spell) => isWithinSpan(spell, date)),
      );

    return rows.filter((row) => row.entries.length > 0 || isPlannable(row));
  }

  async countRemovable(
    query: PlanningRemovalCountQuery,
    user: AuthUser,
  ): Promise<{ count: number }> {
    // The same people the membership update is allowed to remove.
    const removable = await this.teamVisibility.filterVisibleUserIds(
      query.userIds,
      user,
      { includeSelf: true },
    );
    if (removable.size === 0) return { count: 0 };

    const company = await this.getCompany(user.companyId);
    const qb = this.repo.createQueryBuilder('p');
    this.applyRemovableFilter(
      qb,
      'p',
      user.companyId,
      query.projectIds,
      [...removable],
      todayISODate(company.timezone),
    );

    return { count: await qb.getCount() };
  }

  /** Who has plans on a project from today on, and how many: what archiving it removes. */
  async plansFromToday(
    companyId: string,
    projectId: string,
  ): Promise<{ people: User[]; planCount: number }> {
    const company = await this.getCompany(companyId);
    const qb = this.repo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.user', 'u');
    this.applyRemovableFilter(
      qb,
      'p',
      companyId,
      [projectId],
      undefined,
      todayISODate(company.timezone),
    );

    const entries = await qb
      .orderBy('u.firstName', 'ASC')
      .addOrderBy('u.lastName', 'ASC')
      .getMany();

    return {
      people: [
        ...new Map(entries.map((entry) => [entry.userId, entry.user])).values(),
      ],
      planCount: entries.length,
    };
  }

  // ==========================================
  // WRITE
  // ==========================================

  /**
   * What a period plan would do, checked with the same rules the save uses,
   * so the dialog can show the days and every problem before saving. It runs
   * in a transaction because the lock check share-locks the period rows, but
   * it writes nothing.
   */
  async previewPeriod(
    payload: PlanPeriodPayload,
    user: AuthUser,
  ): Promise<PeriodPreview> {
    const {
      plannedDays,
      daysInAnotherTeam,
      problems,
      lines,
      writes,
      dayLimitMinutes,
      partDays,
    } = await this.dataSource.transaction((manager) =>
      this.resolvePeriod(payload, user, manager),
    );

    return {
      plannedDays: [...plannedDays].sort(),
      problems,
      changes: lines.map(({ projectId }) => ({
        projectId,
        added: writes.created.filter((c) => c.projectId === projectId).length,
        changed: [
          ...writes.changed.map((c) => c.entry),
          ...writes.removed,
        ].filter((entry) => entry.projectId === projectId).length,
      })),
      dayLimitMinutes,
      daysInAnotherTeam,
      partDays,
    };
  }

  /**
   * Sets each listed project to the same hours on the days of the range the
   * person has hours on: every one, or only those that already have it. It
   * writes nothing unless all of it fits: the day and week limits are checked
   * on the result as a whole, and every problem is returned at once.
   */
  async planPeriod(
    payload: PlanPeriodPayload,
    user: AuthUser,
  ): Promise<PlannedPeriod> {
    const { userId, startDate, endDate } = payload;
    assertDateRange(startDate, endDate);

    return this.dataSource.transaction(async (manager) => {
      // Reach first, so nobody outside it is locked or described; it is
      // checked again under the lock.
      await this.daysOutsideReach(userId, user, startDate, endDate);
      await lockUser(manager, userId, user.companyId);

      const { plannedDays, problems, writes } = await this.resolvePeriod(
        payload,
        user,
        manager,
      );

      if (plannedDays.size === 0) {
        throw new BadRequestException(
          `There is no working day to plan from ${formatDay(startDate)} to ${formatDay(endDate)}: weekends, absences, days before the person joined and days in another team are skipped.`,
        );
      }
      if (problems.length > 0) {
        throw new BadRequestException(problems.map(describePeriodProblem));
      }

      await manager.save(PlanningEntry, [
        ...writes.created.map(({ date, projectId, minutes }) =>
          manager.create(PlanningEntry, {
            companyId: user.companyId,
            userId,
            projectId,
            createdById: user.id,
            plannedMinutes: minutes,
            date,
          }),
        ),
        ...writes.changed.map(({ entry, minutes }) => {
          entry.plannedMinutes = minutes;
          return entry;
        }),
      ]);

      await manager.remove(PlanningEntry, writes.removed);

      return {
        days: plannedDays.size,
        created: writes.created.length,
        updated: writes.changed.length + writes.removed.length,
      };
    });
  }

  /** The checks a period plan and its preview share; it writes nothing. */
  private async resolvePeriod(
    payload: PlanPeriodPayload,
    user: AuthUser,
    manager: EntityManager,
  ): Promise<ResolvedPeriod> {
    const { userId, startDate, endDate } = payload;
    assertDateRange(startDate, endDate);

    const lines: PeriodLine[] = payload.projects.map((project) => ({
      projectId: project.projectId,
      minutesPerDay: project.minutesPerDay,
      existingDaysOnly: project.existingDaysOnly ?? false,
    }));
    const projectIds = new Set(lines.map((line) => line.projectId));
    if (projectIds.size !== lines.length) {
      throw new BadRequestException('Each project can be listed only once');
    }

    const outsideReach = await this.daysOutsideReach(
      userId,
      user,
      startDate,
      endDate,
    );
    await this.assertActiveUser(userId, user.companyId, manager);

    for (const projectId of projectIds) {
      await this.resolveProject(projectId, user.companyId, manager);
      await this.assertProjectMember(manager, projectId, userId);
    }

    await this.assertPeriodNotLocked(
      manager,
      user.companyId,
      startDate,
      endDate,
    );

    const company = await this.getCompany(user.companyId, manager);
    const weeks = await this.periodWeeks(company, userId, startDate, endDate);

    const workingDays = weeks
      .flatMap((week) => week.workingDays)
      .filter((date) => date >= startDate && date <= endDate);
    const isOutside = (date: string) =>
      outsideReach.some((span) => isWithinSpan(span, date));
    const plannedDays = new Set(workingDays.filter((date) => !isOutside(date)));
    const daysInAnotherTeam = workingDays.filter(isOutside);

    const existing = await manager
      .createQueryBuilder(PlanningEntry, 'p')
      .where('p.company_id = :companyId', { companyId: user.companyId })
      .andWhere('p.user_id = :userId', { userId })
      .andWhere('p.date BETWEEN :from AND :to', {
        from: weeks[0].start,
        to: weeks[weeks.length - 1].end,
      })
      .getMany();

    const [dayLimitOn, partAbsences] = await Promise.all([
      this.dayLimitsFor(company.id, [userId], startDate, endDate),
      this.expectedHours.partAbsenceMinutesFor(
        company.id,
        [userId],
        startDate,
        endDate,
      ),
    ]);
    const partAbsenceOn = partAbsences.get(userId) ?? new Map<string, number>();
    // A partly absent day takes the lines in what its plans on other
    // projects leave of it (decision 16).
    const roomOn = (date: string) => {
      if (!partAbsenceOn.has(date)) return undefined;
      const onOtherProjects = existing
        .filter((e) => e.date === date && !projectIds.has(e.projectId))
        .reduce((sum, e) => sum + e.plannedMinutes, 0);
      return Math.max(0, dayLimitOn(userId, date) - onOtherProjects);
    };
    const writes = periodWrites({ plannedDays, lines, existing, roomOn });
    const problems = periodProblems({
      weeks,
      plannedDays,
      lines,
      writes,
      existing,
      dayLimitOn: (date) => dayLimitOn(userId, date),
    });
    const dayLimitMinutes = Math.max(
      0,
      ...[...eachDate(startDate, endDate)].map((date) =>
        dayLimitOn(userId, date),
      ),
    );

    const partDays = [...partAbsenceOn]
      .filter(([date]) => plannedDays.has(date))
      .map(([date, absenceMinutes]) => ({ date, absenceMinutes }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      plannedDays,
      daysInAnotherTeam,
      problems,
      lines,
      writes,
      dayLimitMinutes,
      partDays,
    };
  }

  /**
   * Deletes one person's plans on one project between two days: the planning
   * permission, nothing in a locked month, and all of them or none.
   */
  async deletePeriodPlans(
    query: DeletePeriodPlansQuery,
    user: AuthUser,
  ): Promise<{ count: number }> {
    const { userId, projectId, startDate, endDate } = query;
    assertDateRange(startDate, endDate);

    return this.dataSource.transaction(async (manager) => {
      // Refuses a range with no day in reach before anyone is locked, and
      // again under the lock; the delete keeps to the days in reach. A
      // deactivated person's leftover plans can still be cleared.
      await this.daysOutsideReach(userId, user, startDate, endDate);
      await lockUser(manager, userId, user.companyId);
      await this.lockProject(manager, projectId, user.companyId);
      await this.daysOutsideReach(userId, user, startDate, endDate);
      await this.assertPeriodNotLocked(
        manager,
        user.companyId,
        startDate,
        endDate,
      );

      // A delete has no alias, so the columns name the table.
      const table = manager.getRepository(PlanningEntry).metadata.tableName;
      const qb = manager
        .createQueryBuilder()
        .delete()
        .from(PlanningEntry)
        .where('company_id = :companyId', { companyId: user.companyId })
        .andWhere('user_id = :userId', { userId })
        .andWhere('project_id = :projectId', { projectId })
        .andWhere('date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      this.teamVisibility.applyUserVisibility(qb, `${table}.user_id`, user, {
        includeSelf: true,
        onDays: { startColumn: `${table}.date` },
      });
      const { affected } = await qb.execute();

      return { count: affected ?? 0 };
    });
  }

  /**
   * Deletes a project's plans from today on: the given members', inside the
   * membership transaction before their `project_users` rows go, or everyone's
   * when no `userIds` are given, inside the archive transaction.
   */
  async deletePlansFromToday(
    manager: EntityManager,
    companyId: string,
    projectId: string,
    userIds?: string[],
  ): Promise<void> {
    if (userIds?.length === 0) return;

    const company = await this.getCompany(companyId, manager);
    // One statement with the filter itself rather than ids read beforehand, so
    // each plan is checked as it is deleted. A delete has no alias, so the
    // filter names the table.
    const qb = manager.createQueryBuilder().delete().from(PlanningEntry);
    this.applyRemovableFilter(
      qb,
      manager.getRepository(PlanningEntry).metadata.tableName,
      companyId,
      [projectId],
      userIds,
      todayISODate(company.timezone),
    );

    await qb.execute();
  }

  // ==========================================
  // AUTHORIZATION HELPERS
  // ==========================================

  /**
   * The days of a period the caller may not plan the person on, which a
   * period plan skips: for a manager, the days the person was in a team they
   * don't lead. Refuses an employee, and a period with no day in reach.
   */
  private async daysOutsideReach(
    userId: string,
    user: AuthUser,
    startDate: string,
    endDate: string,
  ): Promise<DaySpan[]> {
    if (user.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException('Employees cannot change planning');
    }

    const range = { from: startDate, to: endDate };
    const inView = await this.teamVisibility.daysInView(user, [userId], range);
    const { outside } = inView.get(userId)!;

    // Not one day in reach: refused outright, rather than an empty save.
    const reachesNoDay = outside.some(
      (span) =>
        span.from <= startDate && (span.until === null || span.until > endDate),
    );
    if (reachesNoDay) {
      await this.teamVisibility.assertCanWriteUser(
        userId,
        user,
        PLAN_WORDING,
        range,
      );
    }

    return outside;
  }

  // ==========================================
  // VALIDATION / INTEGRITY HELPERS
  // ==========================================

  private async getCompany(
    companyId: string,
    manager?: EntityManager,
  ): Promise<PlanningCompany> {
    const repo = (manager ?? this.dataSource.manager).getRepository(Company);
    const company = await repo.findOne({
      where: { id: companyId },
      select: ['id', 'timezone', 'weekStartDay'],
    });

    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  private async activeProjectsFor(
    companyId: string,
    userIds: string[],
  ): Promise<Map<string, Pick<Project, 'id' | 'name'>[]>> {
    const byUser = new Map<string, Pick<Project, 'id' | 'name'>[]>();
    if (userIds.length === 0) return byUser;

    const rows = await this.projectRepo
      .createQueryBuilder('project')
      .innerJoin('project_users', 'pu', 'pu.project_id = project.id')
      .select('pu.user_id', 'userId')
      .addSelect('project.id', 'id')
      .addSelect('project.name', 'name')
      .where('project.company_id = :companyId', { companyId })
      .andWhere('project.status = :status', { status: ProjectStatus.ACTIVE })
      .andWhere('pu.user_id IN (:...userIds)', { userIds })
      .orderBy('project.name', 'ASC')
      .getRawMany<{ userId: string; id: string; name: string }>();

    for (const { userId, id, name } of rows) {
      const existing = byUser.get(userId);
      if (existing) existing.push({ id, name });
      else byUser.set(userId, [{ id, name }]);
    }

    return byUser;
  }

  /**
   * Share-locks a project for a plan write: an archive or member removal in
   * progress, which locks it for update, finishes first, and a new one waits.
   */
  private lockProject(
    manager: EntityManager,
    projectId: string,
    companyId: string,
  ): Promise<Project | null> {
    return manager.findOne(Project, {
      where: { id: projectId, companyId },
      lock: { mode: 'pessimistic_read' },
    });
  }

  private async resolveProject(
    projectId: string,
    companyId: string,
    manager: EntityManager,
  ): Promise<Project> {
    const project = await this.lockProject(manager, projectId, companyId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException('Project is not available for planning');
    }

    return project;
  }

  private async assertProjectMember(
    manager: EntityManager,
    projectId: string,
    userId: string,
  ): Promise<void> {
    const rows: unknown[] = await manager.query(
      'SELECT 1 FROM project_users WHERE project_id = $1 AND user_id = $2',
      [projectId, userId],
    );

    if (rows.length === 0) {
      throw new BadRequestException(
        'This person is not a member of the project. Add them to it before planning.',
      );
    }
  }

  /** Runs inside the write's transaction, so a Close at the same moment waits for it. */
  private async assertPeriodNotLocked(
    manager: EntityManager,
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    await this.periodLocks.assertRangeOpen(
      manager,
      companyId,
      startDate,
      endDate,
      "it can't be planned",
    );
  }

  /**
   * The most each person can be planned on a day: their working hours a week
   * on that date over five, the day their expected hours count (Decision 5,
   * Phase 41), or the company's standard day when they have none of their own,
   * less the part of it they are away.
   */
  private async dayLimitsFor(
    companyId: string,
    userIds: string[],
    from: string,
    until: string,
  ): Promise<DayLimitOn> {
    const [timelines, partAbsences] = await Promise.all([
      this.capacity.timelinesFor(companyId, userIds, until),
      this.expectedHours.partAbsenceMinutesFor(companyId, userIds, from, until),
    ]);

    // Whole minutes: a day saved before the 30-minute steps can be 6h 24.4m.
    return (userId, date) =>
      Math.max(
        0,
        Math.floor(timelines.get(userId)?.minutesPerDayOn(date) ?? 0) -
          (partAbsences.get(userId)?.get(date) ?? 0),
      );
  }

  /**
   * Every company week the range touches, with what the person has available
   * in it, which the week's plans are checked against.
   */
  private async periodWeeks(
    company: PlanningCompany,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<PeriodWeek[]> {
    const ranges: { start: string; end: string }[] = [];
    for (
      let week = weekRange(startDate, company.weekStartDay);
      week.start <= endDate;
      week = weekRange(addDays(week.end, 1), company.weekStartDay)
    ) {
      ranges.push(week);
    }

    const expectedByWeek = await this.expectedHours.expectedForRanges(
      company.id,
      userId,
      ranges,
    );

    return ranges.map(({ start, end }, index) => ({
      start,
      end,
      availableMinutes: expectedByWeek[index].total,
      workingDays: expectedByWeek[index].byDate
        .filter((day) => day.minutes > 0)
        .map((day) => day.date),
    }));
  }

  private async assertActiveUser(
    userId: string,
    companyId: string,
    manager: EntityManager,
  ): Promise<void> {
    const user = await manager.findOne(User, {
      select: ['id', 'status'],
      where: { id: userId, companyId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        'Planning can only be created for active users',
      );
    }
  }
}
