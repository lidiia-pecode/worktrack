import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import { Absence } from 'src/absences/entities/absence.entity';
import { assertDateRange } from 'src/reporting/date-range.util';

import { CapacityService } from './capacity.service';
import {
  WORKING_DAYS_PER_WEEK,
  eachDate,
  isWorkingDay,
  todayISODate,
} from './working-days.util';

export interface ExpectedDay {
  date: string;
  minutes: number;
}

export interface ExpectedMinutes {
  /** The whole range. */
  total: number;
  /** Only the days that have finished, which is what "behind" is measured against. */
  toDate: number;
  /** Every date in the range, 0 on weekends, absences and before the start date. Adds up to `total`. */
  byDate: ExpectedDay[];
}

/** Expected over the days of the range that have finished, with the days off behind it. */
export interface Availability {
  /** Capacity minus absences: the same figure as Expected's toDate. */
  availableMinutes: number;
  /** Working days an absence covered, from the start date. */
  absenceDays: number;
}

/** Unrounded sums, so every figure is rounded once at the end. */
interface ShareSums {
  available: number;
  availableToDate: number;
  absenceDaysToDate: number;
  /** Each date's available share, in date order. */
  availableByDate: { date: string; share: number }[];
}

const NOTHING_EXPECTED: ExpectedMinutes = { total: 0, toDate: 0, byDate: [] };

/**
 * Rounds the running total rather than each day, so the days always add up to
 * the rounded total even when a day's share is a fraction of a minute.
 */
const roundDays = (days: ShareSums['availableByDate']): ExpectedDay[] => {
  let runningShare = 0;
  let roundedSoFar = 0;

  return days.map(({ date, share }) => {
    runningShare += share;
    const minutes = Math.round(runningShare) - roundedSoFar;
    roundedSoFar += minutes;
    return { date, minutes };
  });
};

/**
 * How many minutes somebody was expected to work: their capacity from the day
 * their account was created, minus the days they were away. Planning is never
 * consulted — an employee with no plan at all has the same expectation as
 * anybody else.
 */
@Injectable()
export class ExpectedHoursService {
  constructor(
    @InjectRepository(Absence)
    private readonly absenceRepo: Repository<Absence>,
    private readonly capacity: CapacityService,
  ) {}

  async expectedForUser(
    companyId: string,
    userId: string,
    from: string,
    to: string,
  ): Promise<ExpectedMinutes> {
    const expected = await this.expectedFor(companyId, [userId], from, to);
    return expected.get(userId) ?? NOTHING_EXPECTED;
  }

  async expectedFor(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
  ): Promise<Map<string, ExpectedMinutes>> {
    const sums = await this.sumSharesFor(companyId, userIds, from, to);
    const expected = new Map<string, ExpectedMinutes>();

    sums.forEach((sum, userId) => {
      expected.set(userId, {
        total: Math.round(sum.available),
        toDate: Math.round(sum.availableToDate),
        byDate: roundDays(sum.availableByDate),
      });
    });

    return expected;
  }

  /**
   * Expected and the days off behind it, counting only days that have
   * finished, so a month in progress is measured against the time that has
   * actually passed.
   */
  async availabilityToDateFor(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
  ): Promise<Map<string, Availability>> {
    const sums = await this.sumSharesFor(companyId, userIds, from, to);
    const availability = new Map<string, Availability>();

    sums.forEach((sum, userId) => {
      availability.set(userId, {
        availableMinutes: Math.round(sum.availableToDate),
        absenceDays: sum.absenceDaysToDate,
      });
    });

    return availability;
  }

  /**
   * Walks every working day in the range from the person's start date: each
   * contributes a fifth of the capacity in force that day, and counts as
   * available unless an absence covers it.
   */
  private async sumSharesFor(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
  ): Promise<Map<string, ShareSums>> {
    assertDateRange(from, to);

    const sums = new Map<string, ShareSums>();
    if (userIds.length === 0) return sums;

    const calendar = await this.capacity.calendarFor(companyId);
    const today = todayISODate(calendar.timezone);
    const [timelines, startDates, absencesByUser] = await Promise.all([
      this.capacity.timelinesFor(
        companyId,
        userIds,
        to,
        calendar.defaultMinutesPerWeek,
      ),
      this.capacity.startDatesFor(companyId, userIds, calendar.timezone),
      this.absenceRangesFor(companyId, userIds, from, to),
    ]);

    for (const userId of userIds) {
      const timeline = timelines.get(userId);
      const startDate = startDates.get(userId);
      const absences = absencesByUser.get(userId) ?? [];
      const sum: ShareSums = {
        available: 0,
        availableToDate: 0,
        absenceDaysToDate: 0,
        availableByDate: [],
      };

      for (const date of eachDate(from, to)) {
        const available = { date, share: 0 };
        sum.availableByDate.push(available);

        if (!isWorkingDay(date)) continue;
        if (startDate && date < startDate) continue;

        const share =
          (timeline?.minutesPerWeekOn(date) ?? 0) / WORKING_DAYS_PER_WEEK;
        const hasFinished = date < today;

        const isAbsent = absences.some(
          (a) => a.startDate <= date && a.endDate >= date,
        );
        if (isAbsent) {
          if (hasFinished) sum.absenceDaysToDate += 1;
          continue;
        }

        available.share = share;
        sum.available += share;
        if (hasFinished) sum.availableToDate += share;
      }

      sums.set(userId, sum);
    }

    return sums;
  }

  private async absenceRangesFor(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
  ): Promise<Map<string, Pick<Absence, 'startDate' | 'endDate'>[]>> {
    const rows = await this.absenceRepo.find({
      where: {
        companyId,
        userId: In(userIds),
        startDate: LessThanOrEqual(to),
        endDate: MoreThanOrEqual(from),
      },
      select: ['userId', 'startDate', 'endDate'],
    });

    const byUser = new Map<string, Pick<Absence, 'startDate' | 'endDate'>[]>();

    for (const row of rows) {
      const existing = byUser.get(row.userId);
      if (existing) existing.push(row);
      else byUser.set(row.userId, [row]);
    }

    return byUser;
  }
}
