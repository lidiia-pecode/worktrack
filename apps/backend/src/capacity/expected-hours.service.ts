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

  async expectedMinutesForUser(
    companyId: string,
    userId: string,
    from: string,
    to: string,
  ): Promise<number> {
    const expected = await this.expectedMinutesFor(
      companyId,
      [userId],
      from,
      to,
    );

    return expected.get(userId) ?? 0;
  }

  async expectedMinutesFor(
    companyId: string,
    userIds: string[],
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    if (from > to) {
      throw new BadRequestException('from cannot be after to');
    }

    const expected = new Map<string, number>();
    if (userIds.length === 0) return expected;

    const [timelines, absencesByUser] = await Promise.all([
      this.capacity.timelinesFor(companyId, userIds, to),
      this.absenceRangesFor(companyId, userIds, from, to),
    ]);

    for (const userId of userIds) {
      const timeline = timelines.get(userId);
      const absences = absencesByUser.get(userId) ?? [];
      let minutes = 0;

      for (const date of eachDate(from, to)) {
        if (!isWorkingDay(date)) continue;
        if (absences.some((a) => a.startDate <= date && a.endDate >= date)) {
          continue;
        }

        minutes +=
          (timeline?.minutesPerWeekOn(date) ?? 0) / WORKING_DAYS_PER_WEEK;
      }

      expected.set(userId, Math.round(minutes));
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
