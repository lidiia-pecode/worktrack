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
} from './working-days.util';

export interface ExpectedMinutes {
  /** The whole range. */
  total: number;
  /** Only the days that have finished, which is what "behind" is measured against. */
  toDate: number;
}

/**
 * The two halves of Expected, kept apart for utilisation, over the days of the
 * range that have finished.
 */
export interface Availability {
  /** Contracted minutes, ignoring absences. */
  capacityMinutes: number;
  /** The part of that capacity an absence covered. */
  absenceMinutes: number;
  /** Capacity minus absences: the same figure as Expected's toDate. */
  availableMinutes: number;
}

/** Unrounded sums, so every figure is rounded once at the end. */
interface ShareSums {
  available: number;
  availableToDate: number;
  capacityToDate: number;
}

const NOTHING_EXPECTED: ExpectedMinutes = { total: 0, toDate: 0 };

/**
 * How many minutes somebody was expected to work: their capacity, minus the
 * days they were away. Planning is never consulted — an employee with no plan
 * at all has the same expectation as anybody else.
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
      });
    });

    return expected;
  }

  /**
   * Capacity and absences read separately, counting only days that have
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
      const capacityMinutes = Math.round(sum.capacityToDate);
      const availableMinutes = Math.round(sum.availableToDate);

      availability.set(userId, {
        capacityMinutes,
        absenceMinutes: capacityMinutes - availableMinutes,
        availableMinutes,
      });
    });

    return availability;
  }

  /**
   * Walks every working day in the range: each contributes a fifth of the
   * capacity in force that day, and counts as available unless an absence
   * covers it.
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

    const [timelines, absencesByUser, today] = await Promise.all([
      this.capacity.timelinesFor(companyId, userIds, to),
      this.absenceRangesFor(companyId, userIds, from, to),
      this.capacity.today(companyId),
    ]);

    for (const userId of userIds) {
      const timeline = timelines.get(userId);
      const absences = absencesByUser.get(userId) ?? [];
      const sum: ShareSums = {
        available: 0,
        availableToDate: 0,
        capacityToDate: 0,
      };

      for (const date of eachDate(from, to)) {
        if (!isWorkingDay(date)) continue;

        const share =
          (timeline?.minutesPerWeekOn(date) ?? 0) / WORKING_DAYS_PER_WEEK;
        const hasFinished = date < today;
        if (hasFinished) sum.capacityToDate += share;

        const isAbsent = absences.some(
          (a) => a.startDate <= date && a.endDate >= date,
        );
        if (isAbsent) continue;

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
