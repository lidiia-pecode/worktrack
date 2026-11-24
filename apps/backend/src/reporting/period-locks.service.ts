import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { findCompanyToday } from 'src/companies/company-today.util';
import { ReportingPeriod } from './entities/reporting-period.entity';
import { ReportingPeriodStatus } from './enums/reporting-period-status.enum';
import {
  addMonths,
  isAutoLocked,
  lastDayOfMonth,
  latestAutoLockedMonth,
  monthsBetween,
} from './reporting-months.util';

/** "October 2026", from any day of the month. */
const formatMonth = (date: string): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/**
 * Which months are locked, and the refusals every write gives over them.
 *
 * Inside a write's transaction, pass its `manager`: the period rows are then
 * read with a share lock, so a Close or Reopen of one of those months waits
 * until the write has finished instead of slipping in between the check and
 * the save.
 */
@Injectable()
export class PeriodLocksService {
  constructor(
    @InjectRepository(ReportingPeriod)
    private readonly periodRepo: Repository<ReportingPeriod>,
  ) {}

  async isDateLocked(
    companyId: string,
    date: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    return this.isRangeLocked(companyId, date, date, manager);
  }

  /** True when any day between the two dates is locked. */
  async isRangeLocked(
    companyId: string,
    startDate: string,
    endDate: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const locked = await this.lockedMonthsIn(
      companyId,
      startDate,
      endDate,
      manager,
    );
    return locked.length > 0;
  }

  /**
   * The locked months between the two dates, each as its first day, oldest
   * first.
   */
  async lockedMonthsIn(
    companyId: string,
    startDate: string,
    endDate: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const today = await findCompanyToday(
      manager ?? this.periodRepo.manager,
      companyId,
    );
    const autoLocked = monthsBetween(startDate, endDate).filter((month) =>
      isAutoLocked(month, today),
    );

    if (autoLocked.length === 0) return [];

    const reopened = await this.findReopenedMonths(
      companyId,
      autoLocked,
      manager,
    );
    return autoLocked.filter((month) => !reopened.has(month));
  }

  /**
   * The last day of the newest locked month. Anything effective on or before
   * it would rewrite a closed month.
   */
  async latestLockedDate(
    companyId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const today = await findCompanyToday(
      manager ?? this.periodRepo.manager,
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

  /**
   * The first days of the months an owner has reopened, optionally only among
   * the given ones.
   */
  async findReopenedMonths(
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

  /**
   * Refuses a write that touches a locked month. `consequence` finishes the
   * sentence "October 2026 is locked, so …".
   */
  async assertRangeOpen(
    manager: EntityManager,
    companyId: string,
    startDate: string,
    endDate: string,
    consequence: string,
  ): Promise<void> {
    const [lockedMonth] = await this.lockedMonthsIn(
      companyId,
      startDate,
      endDate,
      manager,
    );

    if (lockedMonth) {
      throw lockedMonthError(
        `${formatMonth(lockedMonth)} is locked, so ${consequence}.`,
      );
    }
  }

  /**
   * Refuses a change whose first affected day is in a locked month or before
   * one. `refusal` opens the sentence and names the day, as in "Working hours
   * can't change from Wed 14 Oct".
   */
  async assertAfterLockedMonths(
    manager: EntityManager,
    companyId: string,
    firstAffectedDay: string,
    refusal: string,
  ): Promise<void> {
    const lockedUntil = await this.latestLockedDate(companyId, manager);

    if (firstAffectedDay <= lockedUntil) {
      throw lockedMonthError(
        `${refusal}: months up to ${formatMonth(lockedUntil)} are locked.`,
        'a month',
      );
    }
  }
}

/** A refusal over a locked month, saying who can open it again. */
export const lockedMonthError = (
  reason: string,
  month: 'the month' | 'a month' = 'the month',
) =>
  new ForbiddenException(`${reason} The owner can reopen ${month} in Periods.`);
