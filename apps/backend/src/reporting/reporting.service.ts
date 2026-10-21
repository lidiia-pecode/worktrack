import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { Company } from 'src/companies/entities/company.entity';
import { findCompanyToday } from 'src/companies/company-today.util';
import { ReportingPeriod } from './entities/reporting-period.entity';
import { ReportingPeriodStatus } from './enums/reporting-period-status.enum';
import { ReportingMonthState } from './enums/reporting-month-state.enum';
import {
  addMonths,
  editableUntil,
  firstDayOfMonth,
  isAutoLocked,
  lastDayOfMonth,
  latestAutoLockedMonth,
  monthsBetween,
  toMonthKey,
} from './reporting-months.util';
import { assertDateRange, lastCountedDay } from './date-range.util';
import { AuthUser } from 'src/auth/auth-strategies/types';
import { ReportingPeriodsQuery } from './dtos/reporting-month.dto';
import { HoursReportQuery } from './dtos/hours-report-query.dto';
import { HoursReportGroupBy } from './enums/hours-report-group-by.enum';
import { HoursExportQuery } from './dtos/hours-export-query.dto';
import { HoursBilling } from './enums/hours-billing.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';

/** What every report returns besides its rows and totals. */
export interface ReportCoverage {
  /** True while any month in the range can still be edited. */
  isProvisional: boolean;
  /**
   * The last day counted when the range reaches today or later; null when the
   * whole range was counted.
   */
  countedUntil: string | null;
}

export interface ReportingMonth {
  /** YYYY-MM */
  month: string;
  state: ReportingMonthState;
  /** The last editable day while the month is open or in its grace window. */
  editableUntil: string | null;
  /** Who last reopened or closed the month by hand; null while nobody has. */
  changedBy: string | null;
  /** When that happened (ISO 8601); null while nobody has. */
  changedAt: string | null;
}

type MonthChange = Pick<ReportingMonth, 'changedBy' | 'changedAt'>;

export interface HoursSplit {
  /** Time marked billable, on any project. */
  billableMinutes: number;
  /** Time not marked billable, on any project. */
  nonBillableMinutes: number;
  totalMinutes: number;
}

export interface HoursReportRow extends HoursSplit {
  /** The project, activity or person id; null when grouped by client. */
  id: string | null;
  /** Null only for internal work when grouped by client. */
  name: string | null;
  /** The client for a project, the category for an activity, the position for a person. */
  detail: string | null;
  /** Planned for the same days; null by activity, which plans don't have. */
  plannedMinutes: number | null;
  /** The people who logged or planned time on it; only by project or client. */
  peopleCount: number | null;
}

export interface HoursReport extends ReportCoverage {
  /** The grouping these rows were built with. */
  groupBy: HoursReportGroupBy;
  rows: HoursReportRow[];
  totals: HoursSplit & Pick<HoursReportRow, 'plannedMinutes' | 'peopleCount'>;
}

interface HoursReportRawRow {
  /** What the rows are grouped on, to match each one with its plan. */
  groupKey: string | null;
  id: string | null;
  name: string | null;
  detail: string | null;
  billableMinutes: string;
  nonBillableMinutes: string;
  totalMinutes: string;
  userIds: string[];
}

/** One day's time and plans, over the people the Hours report counts. */
export interface DayMinutes {
  date: string;
  loggedMinutes: number;
  billableMinutes: number;
  plannedMinutes: number;
}

interface DayMinutesRawRow {
  date: string;
  loggedMinutes?: string;
  billableMinutes?: string;
  plannedMinutes?: string;
}

/** One row of the hours export: a person's time on one day, project, activity and billing. */
export interface HoursExportRow {
  date: string;
  person: string;
  email: string;
  client: string | null;
  project: string;
  activity: string;
  category: string | null;
  billing: HoursBilling;
  minutes: number;
  /** False while the month can still be edited, so the figure may change. */
  isPeriodClosed: boolean;
}

interface HoursExportRawRow {
  date: string;
  person: string;
  email: string;
  client: string | null;
  project: string;
  activity: string;
  category: string | null;
  billing: HoursBilling;
  minutes: string;
}

/** An empty client name counts as no client, which means internal work. */
const CLIENT_NAME = `NULLIF(p.client_name, '')`;

/**
 * Client names are free text and older ones were stored lowercase, so "Acme"
 * and "acme" are grouped as one client, shown with a spelling that has
 * capitals when there is one.
 */
const CLIENT_GROUP = `LOWER(${CLIENT_NAME})`;
const CLIENT_DISPLAY_NAME = `COALESCE(
  MAX(CASE WHEN ${CLIENT_NAME} <> LOWER(${CLIENT_NAME}) THEN ${CLIENT_NAME} END),
  MIN(${CLIENT_NAME})
)`;

/**
 * The same spelling rule as `CLIENT_DISPLAY_NAME`, applied across every row of
 * the export, so one client never appears under two spellings.
 */
const CLIENT_EXPORT_NAME = `COALESCE(
  MAX(CASE WHEN ${CLIENT_NAME} <> LOWER(${CLIENT_NAME}) THEN ${CLIENT_NAME} END)
    OVER (PARTITION BY ${CLIENT_GROUP}),
  MIN(${CLIENT_NAME}) OVER (PARTITION BY ${CLIENT_GROUP})
)`;

const BILLING = `CASE
  WHEN tl.is_billable THEN '${HoursBilling.BILLABLE}'
  ELSE '${HoursBilling.NON_BILLABLE}'
END`;

interface HoursGrouping {
  /** One value per row, shared by the time and planning queries. */
  key: string;
  id: string;
  name: string;
  detail: string;
  groupBy: string[];
}

const HOURS_GROUPINGS: Record<HoursReportGroupBy, HoursGrouping> = {
  [HoursReportGroupBy.CLIENT]: {
    key: CLIENT_GROUP,
    id: 'NULL',
    name: CLIENT_DISPLAY_NAME,
    detail: 'NULL',
    groupBy: [CLIENT_GROUP],
  },
  [HoursReportGroupBy.PROJECT]: {
    key: 'p.id::text',
    id: 'p.id',
    name: 'p.name',
    detail: CLIENT_NAME,
    groupBy: ['p.id'],
  },
  [HoursReportGroupBy.ACTIVITY]: {
    key: 'a.id::text',
    id: 'a.id',
    name: 'a.name',
    detail: 'c.name',
    groupBy: ['a.id', 'c.name'],
  },
  [HoursReportGroupBy.PERSON]: {
    key: 'u.id::text',
    id: 'u.id',
    name: `u.first_name || ' ' || u.last_name`,
    detail: 'u.position',
    groupBy: ['u.id'],
  },
};

/** Plans are made per person, project and day, so they can be summed these ways only. */
const PLANNED_GROUPINGS = new Set([
  HoursReportGroupBy.CLIENT,
  HoursReportGroupBy.PROJECT,
  HoursReportGroupBy.PERSON,
]);

interface PlannedRawRow {
  groupKey: string | null;
  id: string | null;
  name: string | null;
  detail: string | null;
  minutes: string;
  userIds: string[];
}

/** The groupings whose rows say how many people worked on them. */
const PEOPLE_COUNTED_GROUPINGS = new Set([
  HoursReportGroupBy.CLIENT,
  HoursReportGroupBy.PROJECT,
]);

/** The ids of everybody behind a row, to count each person once across time and plans. */
const USER_IDS = 'ARRAY_AGG(DISTINCT u.id::text)';

const DEFAULT_MONTHS_LISTED = 12;
const MAX_MONTHS_LISTED = 36;

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(ReportingPeriod)
    private readonly periodRepo: Repository<ReportingPeriod>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly teamVisibility: TeamVisibilityService,
  ) {}

  // ==========================================
  // REPORTING PERIODS
  // ==========================================

  /** Months from `from` to `to` (YYYY-MM), newest first, with their state. */
  async listMonths(
    companyId: string,
    query: ReportingPeriodsQuery,
  ): Promise<ReportingMonth[]> {
    const today = await findCompanyToday(this.companyRepo.manager, companyId);
    const lastMonth = firstDayOfMonth(query.to ?? today);
    const firstMonth = query.from
      ? firstDayOfMonth(query.from)
      : addMonths(lastMonth, -(DEFAULT_MONTHS_LISTED - 1));

    if (firstMonth > lastMonth) {
      throw new BadRequestException('from cannot be after to');
    }

    const months = monthsBetween(firstMonth, lastMonth);
    if (months.length > MAX_MONTHS_LISTED) {
      throw new BadRequestException(
        `At most ${MAX_MONTHS_LISTED} months can be listed at once`,
      );
    }

    const periods = await this.periodRepo.find({
      where: { companyId, month: In(months) },
      relations: { changedBy: true },
    });
    const periodByMonth = new Map(
      periods.map((period) => [period.month, period]),
    );
    const reopened = new Set(
      periods
        .filter((period) => period.status === ReportingPeriodStatus.OPEN)
        .map((period) => period.month),
    );

    return months.reverse().map((month) => {
      const state = this.stateOf(month, today, reopened);
      const isEditable =
        state === ReportingMonthState.OPEN ||
        state === ReportingMonthState.GRACE;

      return {
        month: toMonthKey(month),
        state,
        editableUntil: isEditable ? editableUntil(month) : null,
        ...this.changeOf(periodByMonth.get(month)),
      };
    });
  }

  async reopenMonth(
    companyId: string,
    monthKey: string,
    actorId: string,
  ): Promise<ReportingMonth> {
    const month = firstDayOfMonth(monthKey);
    const today = await findCompanyToday(this.companyRepo.manager, companyId);

    if (!isAutoLocked(month, today)) {
      throw new BadRequestException(
        `${monthKey} is not locked yet: it can be edited until ${editableUntil(month)}`,
      );
    }

    return this.periodRepo.manager.transaction(async (manager) => {
      const period =
        (await this.findPeriodForUpdate(manager, companyId, month)) ??
        manager.create(ReportingPeriod, { companyId, month });

      if (period.status === ReportingPeriodStatus.OPEN) {
        throw new ConflictException(`${monthKey} is already reopened`);
      }

      period.status = ReportingPeriodStatus.OPEN;
      period.changedById = actorId;

      // A month reopened for the first time has no row to lock, so a second
      // Reopen racing this one hits the unique index instead.
      try {
        await manager.save(period);
      } catch (error) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(`${monthKey} is already reopened`);
        }
        throw error;
      }

      return {
        month: monthKey,
        state: ReportingMonthState.REOPENED,
        editableUntil: null,
        ...(await this.changeOfSaved(manager, period.id)),
      };
    });
  }

  async closeMonth(
    companyId: string,
    monthKey: string,
    actorId: string,
  ): Promise<ReportingMonth> {
    return this.periodRepo.manager.transaction(async (manager) => {
      const period = await this.findPeriodForUpdate(
        manager,
        companyId,
        firstDayOfMonth(monthKey),
      );

      if (period?.status !== ReportingPeriodStatus.OPEN) {
        throw new ConflictException(
          `${monthKey} was not reopened, so there is nothing to close`,
        );
      }

      period.status = ReportingPeriodStatus.LOCKED;
      period.changedById = actorId;
      await manager.save(period);

      return {
        month: monthKey,
        state: ReportingMonthState.LOCKED,
        editableUntil: null,
        ...(await this.changeOfSaved(manager, period.id)),
      };
    });
  }

  async isDateLocked(
    companyId: string,
    date: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    return this.isRangeLocked(companyId, date, date, manager);
  }

  /**
   * True when any day between the two dates is locked. A record covering a
   * range is frozen as soon as it touches one.
   *
   * Inside a write's transaction, pass its `manager`: the period rows are then
   * read with a share lock, so a Close or Reopen of one of those months waits
   * until the write has finished instead of slipping in between the check and
   * the save.
   */
  async isRangeLocked(
    companyId: string,
    startDate: string,
    endDate: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const today = await findCompanyToday(
      manager ?? this.companyRepo.manager,
      companyId,
    );
    const autoLocked = monthsBetween(startDate, endDate).filter((month) =>
      isAutoLocked(month, today),
    );

    if (autoLocked.length === 0) return false;

    const reopened = await this.findReopenedMonths(
      companyId,
      autoLocked,
      manager,
    );
    return autoLocked.some((month) => !reopened.has(month));
  }

  /**
   * The last day of the newest locked month. Anything effective on or before
   * it would rewrite a closed month. Takes a write's `manager` like
   * `isRangeLocked`, for the same reason.
   */
  async latestLockedDate(
    companyId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const today = await findCompanyToday(
      manager ?? this.companyRepo.manager,
      companyId,
    );
    const reopened = await this.findReopenedMonths(
      companyId,
      undefined,
      manager,
    );

    let month = latestAutoLockedMonth(today);
    while (reopened.has(month)) {
      month = addMonths(month, -1);
    }

    return lastDayOfMonth(month);
  }

  private stateOf(
    month: string,
    today: string,
    reopened: Set<string>,
  ): ReportingMonthState {
    if (!isAutoLocked(month, today)) {
      return today <= lastDayOfMonth(month)
        ? ReportingMonthState.OPEN
        : ReportingMonthState.GRACE;
    }

    return reopened.has(month)
      ? ReportingMonthState.REOPENED
      : ReportingMonthState.LOCKED;
  }

  /**
   * The first days of the months an owner has reopened, optionally only among
   * the given ones. With a transaction's `manager`, the rows are share-locked
   * until it ends (see `isRangeLocked`).
   */
  private async findReopenedMonths(
    companyId: string,
    among?: string[],
    manager?: EntityManager,
  ): Promise<Set<string>> {
    const rows = await (manager ?? this.periodRepo.manager).find(
      ReportingPeriod,
      {
        where: {
          companyId,
          status: ReportingPeriodStatus.OPEN,
          ...(among && { month: In(among) }),
        },
        select: ['month'],
        ...(manager && { lock: { mode: 'pessimistic_read' } }),
      },
    );

    return new Set(rows.map((row) => row.month));
  }

  /** The month's row, locked against another Close or Reopen until the transaction ends. */
  private findPeriodForUpdate(
    manager: EntityManager,
    companyId: string,
    month: string,
  ): Promise<ReportingPeriod | null> {
    return manager.findOne(ReportingPeriod, {
      where: { companyId, month },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private changeOf(period: ReportingPeriod | undefined): MonthChange {
    if (!period) return { changedBy: null, changedAt: null };

    return {
      changedBy: period.changedBy
        ? `${period.changedBy.firstName} ${period.changedBy.lastName}`
        : null,
      changedAt: period.updatedAt.toISOString(),
    };
  }

  private async changeOfSaved(
    manager: EntityManager,
    periodId: string,
  ): Promise<MonthChange> {
    const saved = await manager.findOneOrFail(ReportingPeriod, {
      where: { id: periodId },
      relations: { changedBy: true },
    });

    return this.changeOf(saved);
  }

  /**
   * Whether the range is still provisional and, when it reaches today or
   * later, the last day a report counts.
   */
  private async coverageOf(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    today: string,
  ): Promise<ReportCoverage> {
    const locked = await this.findLockedMonths(
      companyId,
      dateFrom,
      dateTo,
      today,
    );
    const countedTo = lastCountedDay(dateTo, today);

    return {
      isProvisional: monthsBetween(dateFrom, dateTo).some(
        (month) => !locked.has(month),
      ),
      countedUntil: countedTo < dateTo ? countedTo : null,
    };
  }

  /** The first days of the locked months touching the range. */
  private async findLockedMonths(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    today: string,
  ): Promise<Set<string>> {
    const months = monthsBetween(dateFrom, dateTo);
    const reopened = await this.findReopenedMonths(companyId, months);

    return new Set(
      months.filter(
        (month) =>
          this.stateOf(month, today, reopened) === ReportingMonthState.LOCKED,
      ),
    );
  }

  // ==========================================
  // ANALYTICS & REPORTS
  // ==========================================

  /**
   * Logged time over a date range, finished days only, grouped one way and
   * split into billable and non-billable by each entry's flag, on any project
   * (D2). Grouped by client, project or person, each row also carries what was
   * planned for the same days, and a row with a plan but no time is listed too.
   */
  async getHoursReport(
    user: AuthUser,
    query: HoursReportQuery,
  ): Promise<HoursReport> {
    const { dateFrom, dateTo, groupBy } = query;

    assertDateRange(dateFrom, dateTo);

    const today = await findCompanyToday(
      this.companyRepo.manager,
      user.companyId,
    );
    const grouping = HOURS_GROUPINGS[groupBy];

    const countedTo = lastCountedDay(dateTo, today);

    const qb = this.periodRepo.manager
      .createQueryBuilder()
      .select(grouping.key, 'groupKey')
      .addSelect(grouping.id, 'id')
      .addSelect(grouping.name, 'name')
      .addSelect(grouping.detail, 'detail')
      .addSelect(
        'SUM(CASE WHEN tl.is_billable THEN tl.minutes ELSE 0 END)',
        'billableMinutes',
      )
      .addSelect(
        'SUM(CASE WHEN NOT tl.is_billable THEN tl.minutes ELSE 0 END)',
        'nonBillableMinutes',
      )
      .addSelect('SUM(tl.minutes)', 'totalMinutes')
      .addSelect(USER_IDS, 'userIds')
      .from('time_logs', 'tl')
      .innerJoin('project_activities', 'pa', 'pa.id = tl.project_activity_id')
      .innerJoin('projects', 'p', 'p.id = pa.project_id')
      .innerJoin('activities', 'a', 'a.id = pa.activity_id')
      .leftJoin('act_categories', 'c', 'c.id = a.category_id')
      .innerJoin('users', 'u', 'u.id = tl.user_id')
      .where('tl.company_id = :companyId', { companyId: user.companyId })
      .andWhere('tl.date BETWEEN :dateFrom AND :countedTo', {
        dateFrom,
        countedTo,
      });

    this.teamVisibility.applyUserVisibility(qb, 'tl.user_id', user, {
      includeSelf: true,
    });
    this.applyRowFilters(qb, query);

    qb.groupBy(grouping.groupBy.join(', '));

    qb.orderBy('"totalMinutes"', 'DESC')
      .addOrderBy('"name"', 'ASC')
      .addOrderBy('"id"', 'ASC');

    const [rawRows, plannedRows] = await Promise.all([
      qb.getRawMany<HoursReportRawRow>(),
      PLANNED_GROUPINGS.has(groupBy)
        ? this.plannedRows(user, grouping, query, countedTo)
        : null,
    ]);
    const plannedByKey = new Map(
      plannedRows?.map((planned) => [planned.groupKey, planned]),
    );
    const countsPeople = PEOPLE_COUNTED_GROUPINGS.has(groupBy);
    const peopleCountOf = (...userIds: string[][]) =>
      countsPeople ? new Set(userIds.flat()).size : null;

    const rows: HoursReportRow[] = rawRows.map((raw) => {
      const planned = plannedByKey.get(raw.groupKey);

      return {
        id: raw.id,
        name: raw.name,
        detail: raw.detail,
        billableMinutes: Number(raw.billableMinutes),
        nonBillableMinutes: Number(raw.nonBillableMinutes),
        totalMinutes: Number(raw.totalMinutes),
        plannedMinutes: plannedRows ? Number(planned?.minutes ?? 0) : null,
        peopleCount: peopleCountOf(raw.userIds, planned?.userIds ?? []),
      };
    });

    // Planned with nothing logged: after the rows with time, in the planning
    // query's order by name.
    const loggedKeys = new Set(rawRows.map((raw) => raw.groupKey));
    for (const planned of plannedRows ?? []) {
      if (loggedKeys.has(planned.groupKey)) continue;

      rows.push({
        id: planned.id,
        name: planned.name,
        detail: planned.detail,
        billableMinutes: 0,
        nonBillableMinutes: 0,
        totalMinutes: 0,
        plannedMinutes: Number(planned.minutes),
        peopleCount: peopleCountOf(planned.userIds),
      });
    }

    const loggedTotals = rows.reduce<HoursSplit>(
      (sum, row) => ({
        billableMinutes: sum.billableMinutes + row.billableMinutes,
        nonBillableMinutes: sum.nonBillableMinutes + row.nonBillableMinutes,
        totalMinutes: sum.totalMinutes + row.totalMinutes,
      }),
      {
        billableMinutes: 0,
        nonBillableMinutes: 0,
        totalMinutes: 0,
      },
    );

    const totals = {
      ...loggedTotals,
      plannedMinutes: plannedRows
        ? rows.reduce((sum, row) => sum + (row.plannedMinutes ?? 0), 0)
        : null,
      peopleCount: peopleCountOf(
        ...rawRows.map((raw) => raw.userIds),
        ...(plannedRows ?? []).map((planned) => planned.userIds),
      ),
    };

    return {
      groupBy,
      rows,
      totals,
      ...(await this.coverageOf(user.companyId, dateFrom, dateTo, today)),
    };
  }

  /**
   * Planned minutes over the same days and people as the Hours report, summed
   * by its grouping, which uses only projects and people.
   */
  private plannedRows(
    user: AuthUser,
    grouping: HoursGrouping,
    query: HoursReportQuery,
    countedTo: string,
  ): Promise<PlannedRawRow[]> {
    const qb = this.periodRepo.manager
      .createQueryBuilder()
      .select(grouping.key, 'groupKey')
      .addSelect(grouping.id, 'id')
      .addSelect(grouping.name, 'name')
      .addSelect(grouping.detail, 'detail')
      .addSelect('SUM(e.planned_minutes)', 'minutes')
      .addSelect(USER_IDS, 'userIds')
      .from('planning_entries', 'e')
      .innerJoin('projects', 'p', 'p.id = e.project_id')
      .innerJoin('users', 'u', 'u.id = e.user_id')
      .where('e.company_id = :companyId', { companyId: user.companyId })
      .andWhere('e.date BETWEEN :dateFrom AND :countedTo', {
        dateFrom: query.dateFrom,
        countedTo,
      });

    this.teamVisibility.applyUserVisibility(qb, 'e.user_id', user, {
      includeSelf: true,
    });
    this.applyRowFilters(qb, query);

    return qb
      .groupBy(grouping.groupBy.join(', '))
      .orderBy('"name"', 'ASC')
      .addOrderBy('"id"', 'ASC')
      .getRawMany<PlannedRawRow>();
  }

  /**
   * Narrows a query that joins projects as `p` and users as `u` to one
   * project, one client, internal work or one person, the way Reports opens a
   * project's people or a person's projects.
   */
  private applyRowFilters(
    qb: SelectQueryBuilder<ObjectLiteral>,
    { projectId, client, withoutClient, userId }: HoursReportQuery,
  ): void {
    if (projectId) {
      qb.andWhere('p.id = :projectId', { projectId });
    }
    if (client) {
      qb.andWhere(`${CLIENT_GROUP} = LOWER(:client)`, { client });
    }
    if (withoutClient) {
      qb.andWhere(`${CLIENT_NAME} IS NULL`);
    }
    if (userId) {
      qb.andWhere('u.id = :userId', { userId });
    }
  }

  /**
   * Logged, billable and planned minutes per day, for the same people as the
   * Hours report. The caller has checked the range and cut it at `countedTo`.
   * Days with neither time nor a plan are left out.
   */
  async minutesPerDay(
    user: AuthUser,
    dateFrom: string,
    countedTo: string,
  ): Promise<DayMinutes[]> {
    const manager = this.periodRepo.manager;
    const logged = manager
      .createQueryBuilder()
      .select(`TO_CHAR(tl.date, 'YYYY-MM-DD')`, 'date')
      .addSelect('SUM(tl.minutes)', 'loggedMinutes')
      .addSelect(
        'SUM(CASE WHEN tl.is_billable THEN tl.minutes ELSE 0 END)',
        'billableMinutes',
      )
      .from('time_logs', 'tl')
      .where('tl.company_id = :companyId', { companyId: user.companyId })
      .andWhere('tl.date BETWEEN :dateFrom AND :countedTo', {
        dateFrom,
        countedTo,
      });
    const planned = manager
      .createQueryBuilder()
      .select(`TO_CHAR(e.date, 'YYYY-MM-DD')`, 'date')
      .addSelect('SUM(e.planned_minutes)', 'plannedMinutes')
      .from('planning_entries', 'e')
      .where('e.company_id = :companyId', { companyId: user.companyId })
      .andWhere('e.date BETWEEN :dateFrom AND :countedTo', {
        dateFrom,
        countedTo,
      });

    this.teamVisibility.applyUserVisibility(logged, 'tl.user_id', user, {
      includeSelf: true,
    });
    this.teamVisibility.applyUserVisibility(planned, 'e.user_id', user, {
      includeSelf: true,
    });

    const rawRows = (
      await Promise.all([
        logged.groupBy('tl.date').getRawMany<DayMinutesRawRow>(),
        planned.groupBy('e.date').getRawMany<DayMinutesRawRow>(),
      ])
    ).flat();

    const byDate = new Map<string, DayMinutes>();
    for (const raw of rawRows) {
      const day = byDate.get(raw.date) ?? {
        date: raw.date,
        loggedMinutes: 0,
        billableMinutes: 0,
        plannedMinutes: 0,
      };
      day.loggedMinutes += Number(raw.loggedMinutes ?? 0);
      day.billableMinutes += Number(raw.billableMinutes ?? 0);
      day.plannedMinutes += Number(raw.plannedMinutes ?? 0);
      byDate.set(raw.date, day);
    }

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * The Hours report's time, for the same people and days, one row per
   * person, day, project, activity and billing.
   */
  async getHoursExport(
    user: AuthUser,
    query: HoursExportQuery,
  ): Promise<HoursExportRow[]> {
    const { dateFrom, dateTo } = query;

    assertDateRange(dateFrom, dateTo);

    const today = await findCompanyToday(
      this.companyRepo.manager,
      user.companyId,
    );
    const qb = this.periodRepo.manager
      .createQueryBuilder()
      .select(`TO_CHAR(tl.date, 'YYYY-MM-DD')`, 'date')
      .addSelect(`u.first_name || ' ' || u.last_name`, 'person')
      .addSelect('u.email', 'email')
      .addSelect(CLIENT_EXPORT_NAME, 'client')
      .addSelect('p.name', 'project')
      .addSelect('a.name', 'activity')
      .addSelect('c.name', 'category')
      .addSelect(BILLING, 'billing')
      .addSelect('SUM(tl.minutes)', 'minutes')
      .from('time_logs', 'tl')
      .innerJoin('project_activities', 'pa', 'pa.id = tl.project_activity_id')
      .innerJoin('projects', 'p', 'p.id = pa.project_id')
      .innerJoin('activities', 'a', 'a.id = pa.activity_id')
      .leftJoin('act_categories', 'c', 'c.id = a.category_id')
      .innerJoin('users', 'u', 'u.id = tl.user_id')
      .where('tl.company_id = :companyId', { companyId: user.companyId })
      .andWhere('tl.date BETWEEN :dateFrom AND :countedTo', {
        dateFrom,
        countedTo: lastCountedDay(dateTo, today),
      });

    this.teamVisibility.applyUserVisibility(qb, 'tl.user_id', user, {
      includeSelf: true,
    });

    const [rawRows, lockedMonths] = await Promise.all([
      qb
        .groupBy(
          ['tl.date', 'u.id', 'p.id', 'a.id', 'c.id', BILLING].join(', '),
        )
        .orderBy('tl.date')
        .addOrderBy('person')
        .addOrderBy('u.id')
        .addOrderBy('project')
        .addOrderBy('activity')
        .addOrderBy('billing')
        .getRawMany<HoursExportRawRow>(),
      this.findLockedMonths(user.companyId, dateFrom, dateTo, today),
    ]);

    return rawRows.map((raw) => ({
      ...raw,
      minutes: Number(raw.minutes),
      isPeriodClosed: lockedMonths.has(firstDayOfMonth(raw.date)),
    }));
  }
}
