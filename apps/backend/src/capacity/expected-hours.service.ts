import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { Absence } from 'src/absences/entities/absence.entity';
import { AbsenceType } from 'src/absences/enums/absence-type.enum';
import { assertDateRange } from 'src/reporting/date-range.util';

import { DaySpan, isWithinSpan } from 'src/teams/days-in-view.util';

import { CapacityService } from './capacity.service';
import { eachDate, isWorkingDay, todayISODate } from './working-days.util';

export interface ExpectedDay {
  date: string;
  minutes: number;
}

export interface ExpectedMinutes {
  /** The whole range. */
  total: number;
  /** Only the days that have finished, which is what "behind" is measured against. */
  toDate: number;
  /** Every date in the range, 0 on weekends, absences, before the start date and while deactivated. Adds up to `total`. */
  byDate: ExpectedDay[];
}

/** A finished working day an absence covered whole, and why. */
export interface AbsenceDay {
  date: string;
  type: AbsenceType;
}

/** A finished working day an absence covered part of, with the minutes it took. */
export interface PartAbsenceDay {
  date: string;
  minutes: number;
}

/** Expected over the days of the range that have finished, with the days off behind it. */
export interface Availability {
  /** Capacity minus absences: the same figure as Expected's toDate. */
  availableMinutes: number;
  /** The finished working days with working hours an absence covered whole, from the start date. */
  absenceDays: AbsenceDay[];
  /** The finished working days an absence covered part of; they stay expected days. */
  partAbsenceDays: PartAbsenceDay[];
  /** The finished days they were expected to work, in date order. */
  expectedDates: string[];
  /** Every date's expected minutes, as in Expected's byDate. */
  byDate: ExpectedDay[];
}

/** Unrounded sums, so every figure is rounded once at the end. */
interface ShareSums {
  available: number;
  availableToDate: number;
  absenceDaysToDate: AbsenceDay[];
  partAbsenceDaysToDate: PartAbsenceDay[];
  /** The finished dates with an available share, in date order. */
  expectedDatesToDate: string[];
  /** Each date's available share, in date order. */
  availableByDate: { date: string; share: number }[];
}

type AbsenceSpan = Pick<Absence, 'type' | 'startDate' | 'endDate' | 'minutes'>;

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

  /**
   * `leaveOut` names, per person, days the view doesn't hold, such as the
   * days they were in another team: nothing is expected of them there.
   */
  async expectedFor(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
    leaveOut?: Map<string, DaySpan[]>,
  ): Promise<Map<string, ExpectedMinutes>> {
    assertDateRange(from, to);
    const sums = await this.sumSharesFor(
      companyId,
      userIds,
      from,
      to,
      leaveOut,
    );
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
   * One person's expected minutes for each of several consecutive ranges, such
   * as the weeks of a period, from a single walk. Each range is rounded on its
   * own, so it matches `expectedForUser` called for that range alone. The
   * caller bounds the overall span; each range is checked like any other.
   */
  async expectedForRanges(
    companyId: string,
    userId: string,
    ranges: { start: string; end: string }[],
    manager?: EntityManager,
  ): Promise<Pick<ExpectedMinutes, 'total' | 'byDate'>[]> {
    if (ranges.length === 0) return [];
    ranges.forEach(({ start, end }) => assertDateRange(start, end));

    const sums = await this.sumSharesFor(
      companyId,
      [userId],
      ranges[0].start,
      ranges[ranges.length - 1].end,
      undefined,
      manager,
    );
    const days = sums.get(userId)?.availableByDate ?? [];

    return ranges.map(({ start, end }) => {
      const inRange = days.filter(({ date }) => date >= start && date <= end);
      const total = inRange.reduce((sum, { share }) => sum + share, 0);

      return { total: Math.round(total), byDate: roundDays(inRange) };
    });
  }

  /**
   * Expected and the days off behind it, counting only days that have
   * finished, so a month in progress is measured against the time that has
   * actually passed.
   */
  /** `leaveOut` as for `expectedFor`: days the view doesn't hold. */
  async availabilityToDateFor(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
    leaveOut?: Map<string, DaySpan[]>,
  ): Promise<Map<string, Availability>> {
    assertDateRange(from, to);
    const sums = await this.sumSharesFor(
      companyId,
      userIds,
      from,
      to,
      leaveOut,
    );
    const availability = new Map<string, Availability>();

    sums.forEach((sum, userId) => {
      availability.set(userId, {
        availableMinutes: Math.round(sum.availableToDate),
        absenceDays: sum.absenceDaysToDate,
        partAbsenceDays: sum.partAbsenceDaysToDate,
        expectedDates: sum.expectedDatesToDate,
        byDate: roundDays(sum.availableByDate),
      });
    });

    return availability;
  }

  /**
   * Walks every working day in the range from the person's start date,
   * skipping the spells they were deactivated: each contributes a fifth of the
   * capacity in force that day, and counts as available unless an absence
   * covers it.
   */
  private async sumSharesFor(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
    leaveOut?: Map<string, DaySpan[]>,
    // A transaction's, when one is open (see `CapacityService.calendarFor`).
    manager?: EntityManager,
  ): Promise<Map<string, ShareSums>> {
    const sums = new Map<string, ShareSums>();
    if (userIds.length === 0) return sums;

    const calendar = await this.capacity.calendarFor(companyId, manager);
    const today = todayISODate(calendar.timezone);
    const [timelines, activeDates, absencesByUser] = await Promise.all([
      this.capacity.timelinesFor(
        companyId,
        userIds,
        to,
        calendar.defaultTimeline,
        manager,
      ),
      this.capacity.activeDatesFor(
        companyId,
        userIds,
        calendar.timezone,
        manager,
      ),
      this.absencesIn(companyId, userIds, from, to, manager),
    ]);

    for (const userId of userIds) {
      const timeline = timelines.get(userId);
      const active = activeDates.get(userId);
      const absences = absencesByUser.get(userId) ?? [];
      const leftOut = leaveOut?.get(userId) ?? [];
      const sum: ShareSums = {
        available: 0,
        availableToDate: 0,
        absenceDaysToDate: [],
        partAbsenceDaysToDate: [],
        expectedDatesToDate: [],
        availableByDate: [],
      };

      for (const date of eachDate(from, to)) {
        const available = { date, share: 0 };
        sum.availableByDate.push(available);

        if (!isWorkingDay(date)) continue;
        if (active && date < active.startDate) continue;
        if (active?.inactiveSpells.some((spell) => isWithinSpan(spell, date))) {
          continue;
        }
        if (leftOut.some((span) => isWithinSpan(span, date))) continue;

        const workingDay = timeline?.minutesPerDayOn(date) ?? 0;
        const hasFinished = date < today;

        const absence = absences.find(
          (a) => a.startDate <= date && a.endDate >= date,
        );
        if (absence && absence.minutes === null) {
          // Only a day with working hours is a day off: on a 0h day an
          // absence takes nothing away.
          if (hasFinished && workingDay > 0) {
            sum.absenceDaysToDate.push({ date, type: absence.type });
          }
          continue;
        }

        // Part of a day takes its minutes, never more than the day has, if
        // the person's hours were lowered after it was recorded.
        const partOff = Math.min(absence?.minutes ?? 0, workingDay);
        const share = workingDay - partOff;
        if (hasFinished && partOff > 0) {
          sum.partAbsenceDaysToDate.push({ date, minutes: partOff });
        }

        available.share = share;
        sum.available += share;
        if (hasFinished && share > 0) {
          sum.availableToDate += share;
          sum.expectedDatesToDate.push(date);
        }
      }

      sums.set(userId, sum);
    }

    return sums;
  }

  /**
   * The minutes each person is away on the days an absence covers part of,
   * by date: what planning leaves out of their day.
   */
  async partAbsenceMinutesFor(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
    manager?: EntityManager,
  ): Promise<Map<string, Map<string, number>>> {
    const absences = await this.absencesIn(
      companyId,
      userIds,
      from,
      to,
      manager,
    );
    const byUser = new Map<string, Map<string, number>>();

    absences.forEach((rows, userId) => {
      const byDate = new Map<string, number>();
      for (const { startDate, minutes } of rows) {
        if (minutes !== null) byDate.set(startDate, minutes);
      }
      byUser.set(userId, byDate);
    });

    return byUser;
  }

  private async absencesIn(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
    manager: EntityManager = this.absenceRepo.manager,
  ): Promise<Map<string, AbsenceSpan[]>> {
    const rows = await manager.find(Absence, {
      where: {
        companyId,
        userId: In(userIds),
        startDate: LessThanOrEqual(to),
        endDate: MoreThanOrEqual(from),
      },
      select: ['userId', 'type', 'startDate', 'endDate', 'minutes'],
    });

    const byUser = new Map<string, AbsenceSpan[]>();

    for (const row of rows) {
      const existing = byUser.get(row.userId);
      if (existing) existing.push(row);
      else byUser.set(row.userId, [row]);
    }

    return byUser;
  }
}
