import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';

import { assertDateRange } from '../date-range.util';
import { HoursReportGroupBy } from '../enums/hours-report-group-by.enum';
import { ReportCoverage, ReportingService } from '../reporting.service';
import { PeopleReportQuery } from './dtos/people-report-query.dto';

export interface PeopleReportFigures {
  loggedMinutes: number;
  /** Time marked billable, on any project. */
  billableMinutes: number;
  nonBillableMinutes: number;
  plannedMinutes: number;
  /** Capacity minus time off, over the same finished days. */
  expectedMinutes: number;
  /** Working days an absence covered among those days. */
  timeOffDays: number;
}

export interface PeopleReportRow extends PeopleReportFigures {
  userId: string;
  name: string;
  position: string | null;
  /** Finished days they were expected to work and logged nothing, in date order. */
  daysWithoutTime: string[];
}

export interface PeopleReport extends ReportCoverage {
  rows: PeopleReportRow[];
  totals: PeopleReportFigures & {
    /** How many days without time there are across the rows. */
    daysWithoutTime: number;
  };
}

const NO_FIGURES: PeopleReportFigures = {
  loggedMinutes: 0,
  billableMinutes: 0,
  nonBillableMinutes: 0,
  plannedMinutes: 0,
  expectedMinutes: 0,
  timeOffDays: 0,
};

const addFigures = (
  a: PeopleReportFigures,
  b: PeopleReportFigures,
): PeopleReportFigures => {
  const sum = { ...a };
  for (const key of Object.keys(sum) as (keyof PeopleReportFigures)[]) {
    sum[key] += b[key];
  }
  return sum;
};

/**
 * Each person's logged and planned time beside what was expected of them,
 * over the same finished days. Logged and planned come from the Hours report,
 * so they match it.
 *
 * Lives beside ReportingService rather than in it because capacity already
 * depends on reporting for the period lock.
 */
@Injectable()
export class PeopleReportService {
  constructor(
    @InjectRepository(TimeLog)
    private readonly timeLogRepo: Repository<TimeLog>,
    private readonly reportingService: ReportingService,
    private readonly expectedHours: ExpectedHoursService,
    private readonly teamVisibility: TeamVisibilityService,
  ) {}

  async getPeopleReport(
    user: AuthUser,
    query: PeopleReportQuery,
  ): Promise<PeopleReport> {
    const { dateFrom, dateTo } = query;

    assertDateRange(dateFrom, dateTo);

    const hours = await this.reportingService.getHoursReport(user, {
      dateFrom,
      dateTo,
      groupBy: HoursReportGroupBy.PERSON,
    });
    const hoursByUser = new Map(hours.rows.map((row) => [row.id!, row]));

    // The same people the team grid lists, plus deactivated people with
    // logged or planned time in the range.
    const people = await this.teamVisibility.findVisibleUsers(
      user,
      { includeUserIds: [...hoursByUser.keys()] },
      { includeSelf: true },
    );

    const peopleIds = people.map((person) => person.id);
    const [availability, loggedDates] = await Promise.all([
      this.expectedHours.availabilityToDateFor(
        user.companyId,
        peopleIds,
        dateFrom,
        dateTo,
      ),
      this.loggedDatesFor(user.companyId, peopleIds, dateFrom, dateTo),
    ]);

    const rows = people.map((person): PeopleReportRow => {
      const personHours = hoursByUser.get(person.id);
      const personAvailability = availability.get(person.id);
      const personLoggedDates = loggedDates.get(person.id);

      return {
        userId: person.id,
        name: `${person.firstName} ${person.lastName}`,
        position: person.position ?? null,
        loggedMinutes: personHours?.totalMinutes ?? 0,
        billableMinutes: personHours?.billableMinutes ?? 0,
        nonBillableMinutes: personHours?.nonBillableMinutes ?? 0,
        plannedMinutes: personHours?.plannedMinutes ?? 0,
        expectedMinutes: personAvailability?.availableMinutes ?? 0,
        timeOffDays: personAvailability?.absenceDays ?? 0,
        daysWithoutTime: (personAvailability?.expectedDates ?? []).filter(
          (date) => !personLoggedDates?.has(date),
        ),
      };
    });

    return {
      rows,
      totals: {
        ...rows.reduce<PeopleReportFigures>(addFigures, NO_FIGURES),
        daysWithoutTime: rows.reduce(
          (sum, row) => sum + row.daysWithoutTime.length,
          0,
        ),
      },
      isProvisional: hours.isProvisional,
      countedUntil: hours.countedUntil,
    };
  }

  /**
   * The days each person logged any time on. Only finished days are expected,
   * so the days after the cut-off never need comparing.
   */
  private async loggedDatesFor(
    companyId: string,
    userIds: string[],
    dateFrom: string,
    dateTo: string,
  ): Promise<Map<string, Set<string>>> {
    const byUser = new Map<string, Set<string>>();
    if (userIds.length === 0) return byUser;

    const rows = await this.timeLogRepo
      .createQueryBuilder('tl')
      .select('tl.user_id', 'userId')
      .addSelect(`TO_CHAR(tl.date, 'YYYY-MM-DD')`, 'date')
      .where('tl.company_id = :companyId', { companyId })
      .andWhere({ userId: In(userIds) })
      .andWhere('tl.date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('tl.user_id, tl.date')
      .getRawMany<{ userId: string; date: string }>();

    for (const { userId, date } of rows) {
      const dates = byUser.get(userId) ?? new Set<string>();
      dates.add(date);
      byUser.set(userId, dates);
    }

    return byUser;
  }
}
