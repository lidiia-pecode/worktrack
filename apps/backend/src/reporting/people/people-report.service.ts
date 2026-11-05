import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import {
  Availability,
  ExpectedHoursService,
} from 'src/capacity/expected-hours.service';
import {
  addDays,
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
import {
  DateRange,
  DaySpan,
  TeamMove,
  isWithinSpan,
  movesIn,
} from 'src/teams/days-in-view.util';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';

import { assertDateRange } from '../date-range.util';
import { HoursReportGroupBy } from '../enums/hours-report-group-by.enum';
import { firstDayOfMonth, lastDayOfMonth } from '../reporting-months.util';
import {
  DayMinutes,
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

/**
 * A team the person was in during the period, with their figures on the days
 * they were in it, so a team's rows add up to what the team did.
 */
export interface ReportTeam {
  id: string;
  name: string;
  /** Archived since; only the owner sees one, as nobody leads it. */
  isArchived: boolean;
  figures: PeopleReportFigures;
  /** Where they joined or left the team inside the period. */
  moves: TeamMove[];
}

export interface PeopleReportRow extends PeopleReportFigures {
  userId: string;
  name: string;
  position: string | null;
  role: UserRole;
  /** A deactivated person is listed while their time counts in the range. */
  status: UserStatus;
  /**
   * The teams they were in during the period, by name, archived ones
   * included; for a manager, only the teams they lead.
   */
  teams: ReportTeam[];
  /** Finished days they were expected to work and logged nothing, in date order. */
  daysWithoutTime: string[];
}

export interface PeopleReport extends ReportCoverage {
  rows: PeopleReportRow[];
  totals: PeopleReportFigures;
}

export type TimelineBucketSize = 'week' | 'month';

/** One week or month of the range, cut to the days it counts. */
export interface TimelineBucket {
  start: string;
  end: string;
  /** Working days among the days it counts. */
  workingDays: number;
  /** True when the range or the cut-off leaves part of the week or month out. */
  isPartial: boolean;
  loggedMinutes: number;
  billableMinutes: number;
  plannedMinutes: number;
  expectedMinutes: number;
}

export interface Timeline extends ReportCoverage {
  bucketSize: TimelineBucketSize;
  /** Oldest first, up to the last day counted. */
  buckets: TimelineBucket[];
}

/** What Reports opens with: the People report and its timeline, worked out together. */
export interface ReportOverview {
  people: PeopleReport;
  timeline: Timeline;
}

/**
 * A range of up to this many days, both ends counted (a quarter), reads week
 * by week; a longer one month by month.
 */
const WEEKLY_TIMELINE_MAX_DAYS = 92;

/** What the People report and the timeline both stand on, worked out once. */
interface ReportBasis {
  dateFrom: string;
  dateTo: string;
  /** The last day counted; before `dateFrom` when no day of the range has finished. */
  countedTo: string;
  hours: HoursReport;
  people: VisibleUser[];
  availability: Map<string, Availability>;
  loggedDates: Map<string, Set<string>>;
  /** Each person's minutes per day, over the days counted. */
  days: DayMinutes[];
  teams: Map<string, ReportTeam[]>;
}

/** A team and the days a person was in it. */
interface TeamSpans {
  team: Pick<ReportTeam, 'id' | 'name' | 'isArchived'>;
  spans: DaySpan[];
}

/** An owner's days count too; Needs attention leaves owners out by `role`. */
const canStillLog = (person: VisibleUser) =>
  person.status === UserStatus.ACTIVE;

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

const coverageOf = ({
  isProvisional,
  countedUntil,
}: HoursReport): ReportCoverage => ({ isProvisional, countedUntil });

const bucketSizeFor = (dateFrom: string, dateTo: string): TimelineBucketSize =>
  dateTo <= addDays(dateFrom, WEEKLY_TIMELINE_MAX_DAYS - 1) ? 'week' : 'month';

/**
 * Each person's teams with their figures on the days they were in each team,
 * and on the days the view holds them. A person in one team for the whole
 * period gets their whole figures under it.
 */
const teamPartsFrom = ({
  range,
  teamSpans,
  outside,
  availability,
  days,
}: {
  range: DateRange;
  teamSpans: Map<string, TeamSpans[]>;
  outside: Map<string, DaySpan[]>;
  availability: Map<string, Availability>;
  days: DayMinutes[];
}): Map<string, ReportTeam[]> => {
  const daysByUser = new Map<string, DayMinutes[]>();
  for (const day of days) {
    const userDays = daysByUser.get(day.userId) ?? [];
    userDays.push(day);
    daysByUser.set(day.userId, userDays);
  }

  return new Map(
    [...teamSpans].map(([userId, teams]) => {
      const userOutside = outside.get(userId) ?? [];
      const personAvailability = availability.get(userId);

      return [
        userId,
        teams.map(({ team, spans }): ReportTeam => {
          const counts = (date: string) =>
            spans.some((span) => isWithinSpan(span, date)) &&
            !userOutside.some((span) => isWithinSpan(span, date));
          const teamDays = (daysByUser.get(userId) ?? []).filter((day) =>
            counts(day.date),
          );
          const sum = (pick: (day: DayMinutes) => number) =>
            teamDays.reduce((total, day) => total + pick(day), 0);
          const loggedMinutes = sum((day) => day.loggedMinutes);
          const billableMinutes = sum((day) => day.billableMinutes);

          return {
            ...team,
            figures: {
              loggedMinutes,
              billableMinutes,
              nonBillableMinutes: loggedMinutes - billableMinutes,
              plannedMinutes: sum((day) => day.plannedMinutes),
              expectedMinutes: (personAvailability?.byDate ?? [])
                .filter((day) => counts(day.date))
                .reduce((total, day) => total + day.minutes, 0),
              timeOffDays: (personAvailability?.absenceDates ?? []).filter(
                counts,
              ).length,
            },
            moves: movesIn(range, spans),
          };
        }),
      ];
    }),
  );
};

/** Each person's row and the totals, from what `basisFor` worked out. */
const peopleReportFrom = ({
  hours,
  people,
  availability,
  loggedDates,
  teams,
}: ReportBasis): PeopleReport => {
  const hoursByUser = new Map(hours.rows.map((row) => [row.id, row]));
  const rows = people.map((person): PeopleReportRow => {
    const personHours = hoursByUser.get(person.id);
    const personAvailability = availability.get(person.id);
    const personLoggedDates = loggedDates.get(person.id);

    return {
      userId: person.id,
      name: `${person.firstName} ${person.lastName}`,
      position: person.position ?? null,
      role: person.role,
      status: person.status,
      teams: teams.get(person.id) ?? [],
      loggedMinutes: personHours?.totalMinutes ?? 0,
      billableMinutes: personHours?.billableMinutes ?? 0,
      nonBillableMinutes: personHours?.nonBillableMinutes ?? 0,
      plannedMinutes: personHours?.plannedMinutes ?? 0,
      expectedMinutes: personAvailability?.availableMinutes ?? 0,
      timeOffDays: personAvailability?.absenceDates.length ?? 0,
      daysWithoutTime: canStillLog(person)
        ? (personAvailability?.expectedDates ?? []).filter(
            (date) => !personLoggedDates?.has(date),
          )
        : [],
    };
  });

  return {
    rows,
    totals: rows.reduce<PeopleReportFigures>(addFigures, NO_FIGURES),
    ...coverageOf(hours),
  };
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
    return peopleReportFrom(await this.basisFor(user, query));
  }

  /**
   * The People report and the timeline from one Hours report, one list of
   * people and one walk of expected hours, so the timeline's buckets add up
   * to the report's totals.
   */
  async getOverview(
    user: AuthUser,
    query: PeopleReportQuery,
  ): Promise<ReportOverview> {
    const basis = await this.basisFor(user, query);

    return {
      people: peopleReportFrom(basis),
      timeline: await this.timelineFrom(user, basis),
    };
  }

  private async basisFor(
    user: AuthUser,
    { dateFrom, dateTo, teamId }: PeopleReportQuery,
  ): Promise<ReportBasis> {
    assertDateRange(dateFrom, dateTo);

    const hours = await this.reportingService.getHoursReport(user, {
      dateFrom,
      dateTo,
      teamId,
      groupBy: HoursReportGroupBy.PERSON,
    });
    const people = await this.peopleFor(user, hours, dateFrom, dateTo, teamId);
    // Expected stops where the Hours report stopped counting, so both use the
    // same "today" even across the company's midnight.
    const countedTo = hours.countedUntil ?? dateTo;
    const counted = { from: dateFrom, to: countedTo };
    const hasCountedDays = countedTo >= dateFrom;
    const peopleIds = people.map((person) => person.id);

    // A person counts only on the days the view holds them: a manager's
    // teams', or the filtered team's.
    const inView = await this.teamVisibility.daysInView(
      user,
      peopleIds,
      counted,
      teamId,
    );
    const outside = new Map(
      [...inView].map(([id, days]) => [id, days.outside]),
    );

    const [availability, loggedDates, days, teamSpans] = await Promise.all([
      hasCountedDays
        ? this.expectedHours.availabilityToDateFor(
            user.companyId,
            peopleIds,
            dateFrom,
            countedTo,
            outside,
          )
        : new Map<string, Availability>(),
      this.loggedDatesFor(user.companyId, peopleIds, dateFrom, countedTo),
      hasCountedDays
        ? this.reportingService.minutesPerPersonDay(
            user,
            peopleIds,
            dateFrom,
            countedTo,
            teamId,
          )
        : [],
      this.teamSpansFor(user, peopleIds, dateFrom, dateTo, teamId),
    ]);

    return {
      dateFrom,
      dateTo,
      countedTo,
      hours,
      people,
      availability,
      loggedDates,
      days,
      teams: teamPartsFrom({
        range: { from: dateFrom, to: dateTo },
        teamSpans,
        outside,
        availability,
        days,
      }),
    };
  }

  /**
   * The range's time, plans and expected hours week by week, or month by
   * month past `WEEKLY_TIMELINE_MAX_DAYS`, over the same people and finished
   * days as the People report.
   */
  private async timelineFrom(
    user: AuthUser,
    { dateFrom, dateTo, countedTo, hours, availability, days }: ReportBasis,
  ): Promise<Timeline> {
    const bucketSize = bucketSizeFor(dateFrom, dateTo);
    const coverage = coverageOf(hours);

    if (countedTo < dateFrom) return { bucketSize, buckets: [], ...coverage };

    const weekStartDay = await this.weekStartDayOf(user.companyId);
    const spanOf = (date: string) =>
      bucketSize === 'week'
        ? weekRange(date, weekStartDay)
        : { start: firstDayOfMonth(date), end: lastDayOfMonth(date) };

    const buckets: TimelineBucket[] = [];
    const bucketByDate = new Map<string, TimelineBucket>();

    for (const date of eachDate(dateFrom, countedTo)) {
      const span = spanOf(date);
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
    availability.forEach(({ byDate }) => {
      for (const { date, minutes } of byDate) {
        bucketByDate.get(date)!.expectedMinutes += minutes;
      }
    });

    return { bucketSize, buckets, ...coverage };
  }

  /**
   * The same people the team grid lists, plus deactivated people with logged
   * time in the range; a plan alone doesn't list them. An owner is listed only with logged or planned time:
   * owners often don't track their own, but a plan made for them is part of
   * the month's plan (Decision 27, refined by Decision 44).
   */
  private async peopleFor(
    user: AuthUser,
    hours: HoursReport,
    dateFrom: string,
    dateTo: string,
    teamId: string | undefined,
  ) {
    const loggedIds = new Set(
      hours.rows.filter((row) => row.totalMinutes > 0).map((row) => row.id),
    );
    const plannedIds = new Set(
      hours.rows
        .filter((row) => (row.plannedMinutes ?? 0) > 0)
        .map((row) => row.id),
    );
    const people = await this.teamVisibility.findVisibleUsers(
      user,
      {
        includeUserIds: [...loggedIds],
        teamId,
        during: { from: dateFrom, to: dateTo },
      },
      { includeSelf: true },
    );

    return people.filter(
      (person) =>
        person.role !== UserRole.OWNER ||
        loggedIds.has(person.id) ||
        plannedIds.has(person.id),
    );
  }

  /**
   * The teams each person was in during the period, by name, with the days
   * they were in each; under a team filter only that team. A manager gets
   * only the teams they lead, so Reports never names a team they can't open
   * elsewhere; a team archived since is the owner's to see, marked as such.
   */
  private async teamSpansFor(
    user: AuthUser,
    userIds: string[],
    dateFrom: string,
    dateTo: string,
    teamId: string | undefined,
  ): Promise<Map<string, TeamSpans[]>> {
    const byUser = new Map<string, TeamSpans[]>();
    if (userIds.length === 0) return byUser;

    // Every team for an owner and the teams they lead for a manager, or the
    // filtered team among them.
    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(user);
    const teamIds = teamId
      ? (visibleTeamIds ?? [teamId]).filter((id) => id === teamId)
      : visibleTeamIds;
    if (teamIds?.length === 0) return byUser;

    const qb = this.membershipRepo
      .createQueryBuilder('tm')
      .innerJoinAndSelect('tm.team', 'team')
      .where('tm.company_id = :companyId', { companyId: user.companyId })
      .andWhere('tm.user_id IN (:...userIds)', { userIds })
      .andWhere('tm.joined_at <= :dateTo', { dateTo })
      .andWhere('(tm.left_at IS NULL OR tm.left_at > :dateFrom)', { dateFrom })
      .orderBy('team.name', 'ASC');
    if (teamIds) qb.andWhere('team.id IN (:...teamIds)', { teamIds });
    const memberships = await qb.getMany();

    for (const { userId, team, joinedAt, leftAt } of memberships) {
      const teams = byUser.get(userId) ?? [];
      const span = { from: joinedAt, until: leftAt };
      const known = teams.find((entry) => entry.team.id === team.id);
      if (known) {
        known.spans.push(span);
      } else {
        teams.push({
          team: {
            id: team.id,
            name: team.name,
            isArchived: team.status === TeamStatus.ARCHIVED,
          },
          spans: [span],
        });
      }
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
