import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import { Absence } from 'src/absences/entities/absence.entity';

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
    if (from > to) {
      throw new BadRequestException('from cannot be after to');
    }

    const expected = new Map<string, ExpectedMinutes>();
    if (userIds.length === 0) return expected;

    const [timelines, absencesByUser, today] = await Promise.all([
      this.capacity.timelinesFor(companyId, userIds, to),
      this.absenceRangesFor(companyId, userIds, from, to),
      this.capacity.today(companyId),
    ]);

    for (const userId of userIds) {
      const timeline = timelines.get(userId);
      const absences = absencesByUser.get(userId) ?? [];
      let total = 0;
      let toDate = 0;

      for (const date of eachDate(from, to)) {
        if (!isWorkingDay(date)) continue;
        if (absences.some((a) => a.startDate <= date && a.endDate >= date)) {
          continue;
        }

        const share =
          (timeline?.minutesPerWeekOn(date) ?? 0) / WORKING_DAYS_PER_WEEK;

        total += share;
        if (date < today) toDate += share;
      }

      expected.set(userId, {
        total: Math.round(total),
        toDate: Math.round(toDate),
      });
    }

    return expected;
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
