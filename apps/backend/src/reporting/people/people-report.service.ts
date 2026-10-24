import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import {
  Availability,
  ExpectedHoursService,
} from 'src/capacity/expected-hours.service';
import {
  eachDate,
  isWorkingDay,
  weekRange,
} from 'src/capacity/working-days.util';
import { Company } from 'src/companies/entities/company.entity';
import { WeekDay } from 'src/companies/enums/week-day.enum';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import {
  TeamVisibilityService,
  VisibleUser,
} from 'src/teams/team-visibility.service';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';

import { assertDateRange } from '../date-range.util';
import { HoursReportGroupBy } from '../enums/hours-report-group-by.enum';
import {
  HoursReport,
  ReportCoverage,
  ReportingService,
} from '../reporting.service';
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

export interface ReportTeam {
  id: string;
  name: string;
}

export interface PeopleReportRow extends PeopleReportFigures {
  userId: string;
  name: string;
  position: string | null;
  /** Their active teams, by name; for a manager, only the teams they lead. */
  teams: ReportTeam[];
  /** Finished days they were expected to work and logged nothing, in date order. */
  daysWithoutTime: string[];
}

export interface PeopleReport extends ReportCoverage {
  rows: PeopleReportRow[];
  totals: PeopleReportFigures;
}

/** One week of the range, cut to the days it counts. */
export interface TimelineBucket {
  start: string;
  end: string;
  /** Working days among the days it counts. */
  workingDays: number;
  /** True when the range or the cut-off leaves part of the week out. */
  isPartial: boolean;
  loggedMinutes: number;
  billableMinutes: number;
  plannedMinutes: number;
  expectedMinutes: number;
}

export interface Timeline extends ReportCoverage {
  /** Oldest first, up to the last day counted. */
  buckets: TimelineBucket[];
}

/**
 * Days without time apply only to people expected to log it: not a
 * deactivated person, who can no longer, nor an owner (Decision 27).
 */
const isExpectedToLog = (person: VisibleUser) =>
  person.status === UserStatus.ACTIVE && person.role !== UserRole.OWNER;

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
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(TeamMembership)
    private readonly membershipRepo: Repository<TeamMembership>,
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
    const hoursByUser = new Map(hours.rows.map((row) => [row.id, row]));
    const people = await this.peopleFor(user, hours);
    // Expected stops where the Hours report stopped counting, so both use the
    // same "today" even across the company's midnight.
    const countedTo = hours.countedUntil ?? dateTo;
    const hasCountedDays = countedTo >= dateFrom;

    const peopleIds = people.map((person) => person.id);
    const [availability, loggedDates, teams] = await Promise.all([
      hasCountedDays
        ? this.expectedHours.availabilityToDateFor(
            user.companyId,
            peopleIds,
            dateFrom,
            countedTo,
          )
        : new Map<string, Availability>(),
      this.loggedDatesFor(user.companyId, peopleIds, dateFrom, countedTo),
      this.teamsFor(user, peopleIds),
    ]);

    const rows = people.map((person): PeopleReportRow => {
      const personHours = hoursByUser.get(person.id);
      const personAvailability = availability.get(person.id);
      const personLoggedDates = loggedDates.get(person.id);

      return {
        userId: person.id,
        name: `${person.firstName} ${person.lastName}`,
        position: person.position ?? null,
        teams: teams.get(person.id) ?? [],
        loggedMinutes: personHours?.totalMinutes ?? 0,
        billableMinutes: personHours?.billableMinutes ?? 0,
        nonBillableMinutes: personHours?.nonBillableMinutes ?? 0,
        plannedMinutes: personHours?.plannedMinutes ?? 0,
        expectedMinutes: personAvailability?.availableMinutes ?? 0,
        timeOffDays: personAvailability?.absenceDays ?? 0,
        daysWithoutTime: isExpectedToLog(person)
          ? (personAvailability?.expectedDates ?? []).filter(
              (date) => !personLoggedDates?.has(date),
            )
          : [],
      };
    });

    return {
      rows,
      totals: rows.reduce<PeopleReportFigures>(addFigures, NO_FIGURES),
      isProvisional: hours.isProvisional,
      countedUntil: hours.countedUntil,
    };
  }

  /**
   * The range's time, plans and expected hours week by week, over the same
   * people and finished days as the People report, so the buckets add up to
   * its totals.
   */
  async getTimeline(
    user: AuthUser,
    query: PeopleReportQuery,
  ): Promise<Timeline> {
    const { dateFrom, dateTo } = query;

    assertDateRange(dateFrom, dateTo);

    const hours = await this.reportingService.getHoursReport(user, {
      dateFrom,
      dateTo,
      groupBy: HoursReportGroupBy.PERSON,
    });
    const coverage: ReportCoverage = {
      isProvisional: hours.isProvisional,
      countedUntil: hours.countedUntil,
    };
    const countedTo = hours.countedUntil ?? dateTo;

    if (countedTo < dateFrom) return { buckets: [], ...coverage };

    const people = await this.peopleFor(user, hours);
    const peopleIds = people.map((person) => person.id);
    const [days, expected, weekStartDay] = await Promise.all([
      this.reportingService.minutesPerDay(user, peopleIds, dateFrom, countedTo),
      this.expectedHours.expectedFor(
        user.companyId,
        peopleIds,
        dateFrom,
        countedTo,
      ),
      this.weekStartDayOf(user.companyId),
    ]);

    const buckets: TimelineBucket[] = [];
    const bucketByDate = new Map<string, TimelineBucket>();

    for (const date of eachDate(dateFrom, countedTo)) {
      const span = weekRange(date, weekStartDay);
      let bucket = buckets.at(-1);

      if (!bucket || date > bucket.end) {
        const start = date;
        const end = span.end < countedTo ? span.end : countedTo;
        bucket = {
          start,
          end,
          workingDays: 0,
          isPartial: start > span.start || end < span.end,
          loggedMinutes: 0,
          billableMinutes: 0,
          plannedMinutes: 0,
          expectedMinutes: 0,
        };
        buckets.push(bucket);
      }

      if (isWorkingDay(date)) bucket.workingDays += 1;
      bucketByDate.set(date, bucket);
    }

    for (const day of days) {
      const bucket = bucketByDate.get(day.date)!;
      bucket.loggedMinutes += day.loggedMinutes;
      bucket.billableMinutes += day.billableMinutes;
      bucket.plannedMinutes += day.plannedMinutes;
    }
    expected.forEach(({ byDate }) => {
      for (const { date, minutes } of byDate) {
        bucketByDate.get(date)!.expectedMinutes += minutes;
      }
    });

    return { buckets, ...coverage };
  }

  /**
   * The same people the team grid lists, plus deactivated people with logged
   * time in the range. A plan alone, often left over from before they left,
   * doesn't list them. An owner is listed only with logged time: owners often
   * don't track their own (Decision 27).
   */
  private async peopleFor(user: AuthUser, hours: HoursReport) {
    const loggedIds = new Set(
      hours.rows.filter((row) => row.totalMinutes > 0).map((row) => row.id),
    );
    const people = await this.teamVisibility.findVisibleUsers(
      user,
      { includeUserIds: [...loggedIds] },
      { includeSelf: true },
    );

    return people.filter(
      (person) => person.role !== UserRole.OWNER || loggedIds.has(person.id),
    );
  }

  /**
   * Each person's active teams, by name. A manager gets only the teams they
   * lead, so Reports never names a team they can't open elsewhere.
   */
  private async teamsFor(
    user: AuthUser,
    userIds: string[],
  ): Promise<Map<string, ReportTeam[]>> {
    const byUser = new Map<string, ReportTeam[]>();
    if (userIds.length === 0) return byUser;

    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(user);
    if (visibleTeamIds?.length === 0) return byUser;

    const memberships = await this.membershipRepo.find({
      relations: { team: true },
      where: {
        companyId: user.companyId,
        userId: In(userIds),
        leftAt: IsNull(),
        team: {
          status: TeamStatus.ACTIVE,
          ...(visibleTeamIds ? { id: In(visibleTeamIds) } : {}),
        },
      },
      order: { team: { name: 'ASC' } },
    });

    for (const { userId, team } of memberships) {
      const teams = byUser.get(userId) ?? [];
      teams.push({ id: team.id, name: team.name });
      byUser.set(userId, teams);
    }

    return byUser;
  }

  private async weekStartDayOf(companyId: string): Promise<WeekDay> {
    const company = await this.companyRepo.findOneOrFail({
      where: { id: companyId },
      select: ['id', 'weekStartDay'],
    });
    return company.weekStartDay;
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
