import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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

import { UserRole } from 'src/users/enums/user-role.enum';
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
import { PlannedVsActualQuery } from './dtos/planned-vs-actual-query.dto';
import { ReportingPeriodsQuery } from './dtos/reporting-month.dto';
import { HoursReportQuery } from './dtos/hours-report-query.dto';
import { HoursReportGroupBy } from './enums/hours-report-group-by.enum';
import { HoursExportQuery } from './dtos/hours-export-query.dto';
import { HoursBilling } from './enums/hours-billing.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';

export interface PlannedVsActualRow {
  userId: string;
  name: string;
  position: string | null;
  plannedMinutes: number;
  loggedMinutes: number;
}

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

export interface PlannedVsActualReport extends ReportCoverage {
  rows: PlannedVsActualRow[];
  totals: { plannedMinutes: number; loggedMinutes: number };
}

interface PersonMinutesRawRow {
  userId: string;
  name: string;
  position: string | null;
  minutes: string;
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
  /** Time on projects with a client. Not shown on the report screen; utilisation reads it. */
  clientMinutes: number;
  /** Client work not marked billable. Not shown on the report screen; utilisation reads it. */
  nonBillableClientMinutes: number;
  totalMinutes: number;
}

export interface HoursReportRow extends HoursSplit {
  /** The project, activity or person id; null when grouped by client or month. */
  id: string | null;
  /**
   * The month (YYYY-MM) when grouped by month. Null only for internal work
   * when grouped by client.
   */
  name: string | null;
  /** The client for a project, the category for an activity, the position for a person. */
  detail: string | null;
  /** Planned for the same days; null by activity or month, which plans don't have. */
  plannedMinutes: number | null;
}

export interface HoursReport extends ReportCoverage {
  /** The grouping these rows were built with. */
  groupBy: HoursReportGroupBy;
  rows: HoursReportRow[];
  totals: HoursSplit & Pick<HoursReportRow, 'plannedMinutes'>;
}

interface HoursReportRawRow {
  /** What the rows are grouped on, to match each one with its plan. */
  groupKey: string | null;
  id: string | null;
  name: string | null;
  detail: string | null;
  billableMinutes: string;
  nonBillableMinutes: string;
  clientMinutes: string;
  nonBillableClientMinutes: string;
  totalMinutes: string;
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
  [HoursReportGroupBy.MONTH]: {
    key: `TO_CHAR(tl.date, 'YYYY-MM')`,
    id: 'NULL',
    name: `TO_CHAR(tl.date, 'YYYY-MM')`,
    detail: 'NULL',
    groupBy: [`TO_CHAR(tl.date, 'YYYY-MM')`],
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
}

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
    const isClientWork = `${CLIENT_NAME} IS NOT NULL`;

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
      .addSelect(
        `SUM(CASE WHEN ${isClientWork} THEN tl.minutes ELSE 0 END)`,
        'clientMinutes',
      )
      .addSelect(
        `SUM(CASE WHEN ${isClientWork} AND NOT tl.is_billable THEN tl.minutes ELSE 0 END)`,
        'nonBillableClientMinutes',
      )
      .addSelect('SUM(tl.minutes)', 'totalMinutes')
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

    qb.groupBy(grouping.groupBy.join(', '));

    if (groupBy === HoursReportGroupBy.MONTH) {
      qb.orderBy('"name"', 'ASC');
    } else {
      qb.orderBy('"totalMinutes"', 'DESC')
        .addOrderBy('"name"', 'ASC')
        .addOrderBy('"id"', 'ASC');
    }

    const [rawRows, plannedRows] = await Promise.all([
      qb.getRawMany<HoursReportRawRow>(),
      PLANNED_GROUPINGS.has(groupBy)
        ? this.plannedRows(user, grouping, dateFrom, countedTo)
        : null,
    ]);
    const plannedByKey = new Map(
      plannedRows?.map((planned) => [
        planned.groupKey,
        Number(planned.minutes),
      ]),
    );

    const rows: HoursReportRow[] = rawRows.map((raw) => ({
      id: raw.id,
      name: raw.name,
      detail: raw.detail,
      billableMinutes: Number(raw.billableMinutes),
      nonBillableMinutes: Number(raw.nonBillableMinutes),
      clientMinutes: Number(raw.clientMinutes),
      nonBillableClientMinutes: Number(raw.nonBillableClientMinutes),
      totalMinutes: Number(raw.totalMinutes),
      plannedMinutes: plannedRows
        ? (plannedByKey.get(raw.groupKey) ?? 0)
        : null,
    }));

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
        clientMinutes: 0,
        nonBillableClientMinutes: 0,
        totalMinutes: 0,
        plannedMinutes: Number(planned.minutes),
      });
    }

    const loggedTotals = rows.reduce<HoursSplit>(
      (sum, row) => ({
        billableMinutes: sum.billableMinutes + row.billableMinutes,
        nonBillableMinutes: sum.nonBillableMinutes + row.nonBillableMinutes,
        clientMinutes: sum.clientMinutes + row.clientMinutes,
        nonBillableClientMinutes:
          sum.nonBillableClientMinutes + row.nonBillableClientMinutes,
        totalMinutes: sum.totalMinutes + row.totalMinutes,
      }),
      {
        billableMinutes: 0,
        nonBillableMinutes: 0,
        clientMinutes: 0,
        nonBillableClientMinutes: 0,
        totalMinutes: 0,
      },
    );

    const totals = {
      ...loggedTotals,
      plannedMinutes: plannedRows
        ? rows.reduce((sum, row) => sum + (row.plannedMinutes ?? 0), 0)
        : null,
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
    dateFrom: string,
    countedTo: string,
  ): Promise<PlannedRawRow[]> {
    const qb = this.periodRepo.manager
      .createQueryBuilder()
      .select(grouping.key, 'groupKey')
      .addSelect(grouping.id, 'id')
      .addSelect(grouping.name, 'name')
      .addSelect(grouping.detail, 'detail')
      .addSelect('SUM(e.planned_minutes)', 'minutes')
      .from('planning_entries', 'e')
      .innerJoin('projects', 'p', 'p.id = e.project_id')
      .innerJoin('users', 'u', 'u.id = e.user_id')
      .where('e.company_id = :companyId', { companyId: user.companyId })
      .andWhere('e.date BETWEEN :dateFrom AND :countedTo', {
        dateFrom,
        countedTo,
      });

    this.teamVisibility.applyUserVisibility(qb, 'e.user_id', user, {
      includeSelf: true,
    });

    return qb
      .groupBy(grouping.groupBy.join(', '))
      .orderBy('"name"', 'ASC')
      .addOrderBy('"id"', 'ASC')
      .getRawMany<PlannedRawRow>();
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

  /**
   * Planned against logged minutes per person over a date range, both over
   * finished days only. Employees are pinned to their own figures; nobody sees
   * anyone outside their scope.
   */
  async getPlannedVsActualReport(
    user: AuthUser,
    query: PlannedVsActualQuery,
  ): Promise<PlannedVsActualReport> {
    const { dateFrom, dateTo, userId, projectId } = query;

    assertDateRange(dateFrom, dateTo);

    let targetUserId = userId;

    if (user.role === UserRole.EMPLOYEE) {
      targetUserId = user.id;
    } else if (user.role === UserRole.MANAGER && userId && userId !== user.id) {
      const visible = await this.teamVisibility.isUserInManagedTeams(
        userId,
        user,
      );

      if (!visible) {
        throw new ForbiddenException(
          'You can only report on users in teams you manage',
        );
      }
    }

    const today = await findCompanyToday(
      this.companyRepo.manager,
      user.companyId,
    );
    const filters = {
      dateFrom,
      dateTo: lastCountedDay(dateTo, today),
      targetUserId,
      projectId,
    };
    const manager = this.periodRepo.manager;

    const planned = await this.sumMinutesPerPerson(
      manager
        .createQueryBuilder()
        .from('planning_entries', 'e')
        .select('SUM(e.planned_minutes)', 'minutes'),
      'e.project_id',
      user,
      filters,
    );

    const logged = await this.sumMinutesPerPerson(
      manager
        .createQueryBuilder()
        .from('time_logs', 'e')
        .innerJoin('project_activities', 'pa', 'pa.id = e.project_activity_id')
        .select('SUM(e.minutes)', 'minutes'),
      'pa.project_id',
      user,
      filters,
    );

    const rowsByUser = new Map<string, PlannedVsActualRow>();
    const rowFor = (person: PersonMinutesRawRow) => {
      const row = rowsByUser.get(person.userId) ?? {
        userId: person.userId,
        name: person.name,
        position: person.position,
        plannedMinutes: 0,
        loggedMinutes: 0,
      };
      rowsByUser.set(person.userId, row);
      return row;
    };

    planned.forEach((person) => {
      rowFor(person).plannedMinutes = Number(person.minutes);
    });
    logged.forEach((person) => {
      rowFor(person).loggedMinutes = Number(person.minutes);
    });

    const rows = [...rowsByUser.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId),
    );

    return {
      rows,
      totals: {
        plannedMinutes: rows.reduce((sum, row) => sum + row.plannedMinutes, 0),
        loggedMinutes: rows.reduce((sum, row) => sum + row.loggedMinutes, 0),
      },
      ...(await this.coverageOf(user.companyId, dateFrom, dateTo, today)),
    };
  }

  /**
   * Sums minutes per person over a query whose source table is aliased `e`
   * and has `company_id`, `user_id` and `date`.
   */
  private sumMinutesPerPerson(
    qb: SelectQueryBuilder<ObjectLiteral>,
    projectColumn: string,
    user: AuthUser,
    filters: {
      dateFrom: string;
      dateTo: string;
      targetUserId?: string;
      projectId?: string;
    },
  ): Promise<PersonMinutesRawRow[]> {
    qb.innerJoin('users', 'u', 'u.id = e.user_id')
      .addSelect('u.id', 'userId')
      .addSelect(`u.first_name || ' ' || u.last_name`, 'name')
      .addSelect('u.position', 'position')
      .where('e.company_id = :companyId', { companyId: user.companyId })
      .andWhere('e.date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });

    this.teamVisibility.applyUserVisibility(qb, 'e.user_id', user, {
      includeSelf: true,
    });

    if (filters.targetUserId) {
      qb.andWhere('e.user_id = :targetUserId', {
        targetUserId: filters.targetUserId,
      });
    }

    if (filters.projectId) {
      qb.andWhere(`${projectColumn} = :projectId`, {
        projectId: filters.projectId,
      });
    }

    return qb.groupBy('u.id').getRawMany<PersonMinutesRawRow>();
  }
}
