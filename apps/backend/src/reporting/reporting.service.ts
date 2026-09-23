import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { UserRole } from 'src/users/enums/user-role.enum';
import { Company } from 'src/companies/entities/company.entity';
import { todayISODate } from 'src/capacity/working-days.util';
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
import { AuthUser } from 'src/auth/auth-strategies/types';
import { GetReportQueryDto } from './dtos/report-query.dto';
import { ReportingPeriodsQuery } from './dtos/reporting-month.dto';
import { HoursReportQuery } from './dtos/hours-report-query.dto';
import { HoursReportGroupBy } from './enums/hours-report-group-by.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';

interface PlannedRawResult {
  userId: string;
  totalPlannedMinutes: string | number | null;
}

interface ActualRawResult {
  userId: string;
  totalActualMinutes: string | number | null;
  billableMinutes: string | number | null;
}

export interface ReportingMonth {
  /** YYYY-MM */
  month: string;
  state: ReportingMonthState;
  /** The last editable day while the month is open or in its grace window. */
  editableUntil: string | null;
}

export interface HoursSplit {
  /** Client work marked billable. */
  billableMinutes: number;
  /** Client work not marked billable. */
  nonBillableMinutes: number;
  /** Work on projects with no client, whatever its billable flag. */
  internalMinutes: number;
  totalMinutes: number;
}

export interface HoursReportRow extends HoursSplit {
  /** The project, activity or person id; null when grouped by client. */
  id: string | null;
  /** Null only for internal work when grouped by client. */
  name: string | null;
  /** The client for a project, the category for an activity, the position for a person. */
  detail: string | null;
}

export interface HoursReport {
  rows: HoursReportRow[];
  totals: HoursSplit;
  /** True while any month in the range can still be edited. */
  isProvisional: boolean;
}

interface HoursReportRawRow {
  id: string | null;
  name: string | null;
  detail: string | null;
  billableMinutes: string;
  nonBillableMinutes: string;
  internalMinutes: string;
  totalMinutes: string;
}

/** An empty client name counts as no client, which means internal work. */
const CLIENT_NAME = `NULLIF(p.client_name, '')`;

const HOURS_GROUPINGS: Record<
  HoursReportGroupBy,
  { id: string; name: string; detail: string; groupBy: string[] }
> = {
  [HoursReportGroupBy.CLIENT]: {
    id: 'NULL',
    name: CLIENT_NAME,
    detail: 'NULL',
    groupBy: [CLIENT_NAME],
  },
  [HoursReportGroupBy.PROJECT]: {
    id: 'p.id',
    name: 'p.name',
    detail: CLIENT_NAME,
    groupBy: ['p.id'],
  },
  [HoursReportGroupBy.ACTIVITY]: {
    id: 'a.id',
    name: 'a.name',
    detail: 'c.name',
    groupBy: ['a.id', 'c.name'],
  },
  [HoursReportGroupBy.PERSON]: {
    id: 'u.id',
    name: `u.first_name || ' ' || u.last_name`,
    detail: 'u.position',
    groupBy: ['u.id'],
  },
};

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
    const today = await this.today(companyId);
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

    const reopened = await this.findReopenedMonths(companyId, months);

    return months.reverse().map((month) => {
      const state = this.stateOf(month, today, reopened);
      const isEditable =
        state === ReportingMonthState.OPEN ||
        state === ReportingMonthState.GRACE;

      return {
        month: toMonthKey(month),
        state,
        editableUntil: isEditable ? editableUntil(month) : null,
      };
    });
  }

  async reopenMonth(
    companyId: string,
    monthKey: string,
    actorId: string,
  ): Promise<ReportingMonth> {
    const month = firstDayOfMonth(monthKey);
    const today = await this.today(companyId);

    if (!isAutoLocked(month, today)) {
      throw new BadRequestException(
        `${monthKey} is not locked yet: it can be edited until ${editableUntil(month)}`,
      );
    }

    const period =
      (await this.periodRepo.findOne({ where: { companyId, month } })) ??
      this.periodRepo.create({ companyId, month });

    if (period.status === ReportingPeriodStatus.OPEN) {
      throw new ConflictException(`${monthKey} is already reopened`);
    }

    period.status = ReportingPeriodStatus.OPEN;
    period.changedById = actorId;
    await this.periodRepo.save(period);

    return {
      month: monthKey,
      state: ReportingMonthState.REOPENED,
      editableUntil: null,
    };
  }

  async closeMonth(
    companyId: string,
    monthKey: string,
    actorId: string,
  ): Promise<ReportingMonth> {
    const period = await this.periodRepo.findOne({
      where: { companyId, month: firstDayOfMonth(monthKey) },
    });

    if (period?.status !== ReportingPeriodStatus.OPEN) {
      throw new ConflictException(
        `${monthKey} was not reopened, so there is nothing to close`,
      );
    }

    period.status = ReportingPeriodStatus.LOCKED;
    period.changedById = actorId;
    await this.periodRepo.save(period);

    return {
      month: monthKey,
      state: ReportingMonthState.LOCKED,
      editableUntil: null,
    };
  }

  async isDateLocked(companyId: string, date: string): Promise<boolean> {
    return this.isRangeLocked(companyId, date, date);
  }

  /**
   * True when any day between the two dates is locked. A record covering a
   * range is frozen as soon as it touches one.
   */
  async isRangeLocked(
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<boolean> {
    const today = await this.today(companyId);
    const autoLocked = monthsBetween(startDate, endDate).filter((month) =>
      isAutoLocked(month, today),
    );

    if (autoLocked.length === 0) return false;

    const reopened = await this.findReopenedMonths(companyId, autoLocked);
    return autoLocked.some((month) => !reopened.has(month));
  }

  /**
   * The last day of the newest locked month. Anything effective on or before
   * it would rewrite a closed month.
   */
  async latestLockedDate(companyId: string): Promise<string> {
    const today = await this.today(companyId);
    const reopened = await this.findReopenedMonths(companyId);

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
   * the given ones.
   */
  private async findReopenedMonths(
    companyId: string,
    among?: string[],
  ): Promise<Set<string>> {
    const rows = await this.periodRepo.find({
      where: {
        companyId,
        status: ReportingPeriodStatus.OPEN,
        ...(among && { month: In(among) }),
      },
      select: ['month'],
    });

    return new Set(rows.map((row) => row.month));
  }

  /** Whether any month touching the range is not locked yet. */
  private async hasEditableMonth(
    companyId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<boolean> {
    const today = await this.today(companyId);
    const months = monthsBetween(dateFrom, dateTo);
    const reopened = await this.findReopenedMonths(companyId, months);

    return months.some(
      (month) =>
        this.stateOf(month, today, reopened) !== ReportingMonthState.LOCKED,
    );
  }

  /** Today where the company is, so a month locks at the company's midnight. */
  private async today(companyId: string): Promise<string> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      select: ['id', 'timezone'],
    });

    return todayISODate(company?.timezone);
  }

  // ==========================================
  // ANALYTICS & REPORTS
  // ==========================================

  /**
   * Logged time over a date range, grouped one way and split into billable
   * client work, non-billable client work and internal work (D2).
   */
  async getHoursReport(
    user: AuthUser,
    query: HoursReportQuery,
  ): Promise<HoursReport> {
    const { dateFrom, dateTo, groupBy } = query;

    if (dateFrom > dateTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo');
    }

    const grouping = HOURS_GROUPINGS[groupBy];
    const isClientWork = `${CLIENT_NAME} IS NOT NULL`;

    const qb = this.periodRepo.manager
      .createQueryBuilder()
      .select(grouping.id, 'id')
      .addSelect(grouping.name, 'name')
      .addSelect(grouping.detail, 'detail')
      .addSelect(
        `SUM(CASE WHEN ${isClientWork} AND tl.is_billable THEN tl.minutes ELSE 0 END)`,
        'billableMinutes',
      )
      .addSelect(
        `SUM(CASE WHEN ${isClientWork} AND NOT tl.is_billable THEN tl.minutes ELSE 0 END)`,
        'nonBillableMinutes',
      )
      .addSelect(
        `SUM(CASE WHEN ${CLIENT_NAME} IS NULL THEN tl.minutes ELSE 0 END)`,
        'internalMinutes',
      )
      .addSelect('SUM(tl.minutes)', 'totalMinutes')
      .from('time_logs', 'tl')
      .innerJoin('project_activities', 'pa', 'pa.id = tl.project_activity_id')
      .innerJoin('projects', 'p', 'p.id = pa.project_id')
      .innerJoin('activities', 'a', 'a.id = pa.activity_id')
      .leftJoin('act_categories', 'c', 'c.id = a.category_id')
      .innerJoin('users', 'u', 'u.id = tl.user_id')
      .where('tl.company_id = :companyId', { companyId: user.companyId })
      .andWhere('tl.date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });

    this.teamVisibility.applyUserVisibility(qb, 'tl.user_id', user);

    const rawRows = await qb
      .groupBy(grouping.groupBy.join(', '))
      .orderBy('"totalMinutes"', 'DESC')
      .getRawMany<HoursReportRawRow>();

    const rows = rawRows.map((raw) => ({
      id: raw.id,
      name: raw.name,
      detail: raw.detail,
      billableMinutes: Number(raw.billableMinutes),
      nonBillableMinutes: Number(raw.nonBillableMinutes),
      internalMinutes: Number(raw.internalMinutes),
      totalMinutes: Number(raw.totalMinutes),
    }));

    const totals = rows.reduce<HoursSplit>(
      (sum, row) => ({
        billableMinutes: sum.billableMinutes + row.billableMinutes,
        nonBillableMinutes: sum.nonBillableMinutes + row.nonBillableMinutes,
        internalMinutes: sum.internalMinutes + row.internalMinutes,
        totalMinutes: sum.totalMinutes + row.totalMinutes,
      }),
      {
        billableMinutes: 0,
        nonBillableMinutes: 0,
        internalMinutes: 0,
        totalMinutes: 0,
      },
    );

    return {
      rows,
      totals,
      isProvisional: await this.hasEditableMonth(
        user.companyId,
        dateFrom,
        dateTo,
      ),
    };
  }

  async getPlannedVsActualReport(user: AuthUser, query: GetReportQueryDto) {
    const { companyId, role } = user;
    const { startDate, endDate, userId, projectId } = query;

    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    let targetUserId = userId;

    if (role === UserRole.EMPLOYEE) {
      targetUserId = user.id; // Employee sees only own analytics
    } else if (role === UserRole.MANAGER && userId) {
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

    // 1. Aggregate Planned Minutes
    const plannedQuery = this.periodRepo.manager
      .createQueryBuilder()
      .select('pe.user_id', 'userId')
      .addSelect('SUM(pe.planned_minutes)', 'totalPlannedMinutes')
      .from('planning_entries', 'pe')
      .where('pe.company_id = :companyId', { companyId })
      .andWhere('pe.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    this.teamVisibility.applyUserVisibility(plannedQuery, 'pe.user_id', user);

    if (targetUserId)
      plannedQuery.andWhere('pe.user_id = :targetUserId', { targetUserId });
    if (projectId)
      plannedQuery.andWhere('pe.project_id = :projectId', { projectId });

    const plannedResult = await plannedQuery
      .groupBy('pe.user_id')
      .getRawMany<PlannedRawResult>();

    // 2. Aggregate Actual Logged Minutes
    const actualQuery = this.periodRepo.manager
      .createQueryBuilder()
      .select('tl.user_id', 'userId')
      .addSelect('SUM(tl.minutes)', 'totalActualMinutes')
      .addSelect(
        'SUM(CASE WHEN tl.is_billable = true THEN tl.minutes ELSE 0 END)',
        'billableMinutes',
      )
      .from('time_logs', 'tl')
      .innerJoin('project_activities', 'pa', 'pa.id = tl.project_activity_id')
      .where('tl.company_id = :companyId', { companyId })
      .andWhere('tl.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    this.teamVisibility.applyUserVisibility(actualQuery, 'tl.user_id', user);

    if (targetUserId)
      actualQuery.andWhere('tl.user_id = :targetUserId', { targetUserId });
    if (projectId)
      actualQuery.andWhere('pa.project_id = :projectId', { projectId });

    const actualResult = await actualQuery
      .groupBy('tl.user_id')
      .getRawMany<ActualRawResult>();

    // 3. Merge Datasets
    const map = new Map<
      string,
      {
        userId: string;
        plannedMinutes: number;
        actualMinutes: number;
        billableMinutes: number;
      }
    >();

    plannedResult.forEach((p) => {
      map.set(p.userId, {
        userId: p.userId,
        plannedMinutes: Number(p.totalPlannedMinutes) || 0,
        actualMinutes: 0,
        billableMinutes: 0,
      });
    });

    actualResult.forEach((a) => {
      const existing = map.get(a.userId) || {
        userId: a.userId,
        plannedMinutes: 0,
        actualMinutes: 0,
        billableMinutes: 0,
      };
      existing.actualMinutes = Number(a.totalActualMinutes) || 0;
      existing.billableMinutes = Number(a.billableMinutes) || 0;
      map.set(a.userId, existing);
    });

    return Array.from(map.values()).map((row) => ({
      ...row,
      plannedHours: Number((row.plannedMinutes / 60).toFixed(2)),
      actualHours: Number((row.actualMinutes / 60).toFixed(2)),
      billableHours: Number((row.billableMinutes / 60).toFixed(2)),
      billableRatio:
        row.actualMinutes > 0
          ? Number(((row.billableMinutes / row.actualMinutes) * 100).toFixed(1))
          : 0,
      varianceHours: Number(
        ((row.actualMinutes - row.plannedMinutes) / 60).toFixed(2),
      ),
    }));
  }
}
