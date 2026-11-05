import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThan, Repository } from 'typeorm';

import { Company } from 'src/companies/entities/company.entity';
import { findCompanyToday } from 'src/companies/company-today.util';
import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/user-role.enum';
import { UserInactivePeriod } from 'src/users/entities/user-inactive-period.entity';
import { ReportingService } from 'src/reporting/reporting.service';
import { DaySpan } from 'src/teams/days-in-view.util';

import { UserCapacity } from './entities/user-capacity.entity';
import { CompanyStandardDay } from './entities/company-standard-day.entity';
import { WORKING_DAYS_PER_WEEK, addDays, isoDateIn } from './working-days.util';

export interface CapacityTimeline {
  minutesPerWeekOn: (date: string) => number;
  /**
   * The person's working day on the date: a fifth of their week, the day both
   * expected hours and the planning limit count.
   */
  minutesPerDayOn: (date: string) => number;
}

/** What a day-by-day walk needs from the company. */
export interface CompanyCalendar {
  timezone: string;
  /** The standard day on each date, for people without hours of their own. */
  defaultTimeline: CapacityTimeline;
}

/** Deactivated from `from` up to the day before `until`; `until` is null while they still are. */
export type InactiveSpell = DaySpan;

/** The first day somebody is expected to work, and the spells they were not. */
export interface ActiveDates {
  startDate: string;
  inactiveSpells: InactiveSpell[];
}

export interface CapacityChange {
  validFrom: string;
  minutesPerWeek: number;
}

export interface StandardDayChange {
  validFrom: string;
  hoursPerDay: number;
}

/** The company's standard day today, and the change scheduled after it. */
export interface StandardDay {
  hoursPerDay: number;
  upcoming: StandardDayChange | null;
}

export interface CurrentCapacity {
  userId: string;
  minutesPerWeek: number;
  validFrom: string | null;
  isCompanyDefault: boolean;
  /** The change that starts after today; there is at most one. */
  upcoming: CapacityChange | null;
}

@Injectable()
export class CapacityService {
  constructor(
    @InjectRepository(UserCapacity)
    private readonly repo: Repository<UserCapacity>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserInactivePeriod)
    private readonly inactivePeriodRepo: Repository<UserInactivePeriod>,
    @InjectRepository(CompanyStandardDay)
    private readonly standardDayRepo: Repository<CompanyStandardDay>,
    private readonly reportingService: ReportingService,
  ) {}

  async calendarFor(companyId: string): Promise<CompanyCalendar> {
    const [company, changes] = await Promise.all([
      this.companyRepo.findOne({
        where: { id: companyId },
        select: ['id', 'timezone', 'standardWorkHoursPerDay'],
      }),
      this.standardDayRepo.find({
        where: { companyId },
        order: { validFrom: 'ASC' },
        select: ['validFrom', 'hoursPerDay'],
      }),
    ]);

    if (!company) throw new NotFoundException('Company not found');

    return {
      timezone: company.timezone,
      defaultTimeline: standardDayTimeline(
        company.standardWorkHoursPerDay,
        changes,
      ),
    };
  }

  /**
   * Builds capacity timelines for multiple users in one query
   * to avoid querying the database separately for each user.
   */
  async timelinesFor(
    companyId: string,
    userIds: string[],
    until: string,
    defaultTimeline?: CapacityTimeline,
  ): Promise<Map<string, CapacityTimeline>> {
    const fallback =
      defaultTimeline ?? (await this.calendarFor(companyId)).defaultTimeline;
    const timelines = new Map<string, CapacityTimeline>();

    if (userIds.length === 0) return timelines;

    const rows = await this.repo.find({
      where: {
        companyId,
        userId: In(userIds),
        validFrom: LessThanOrEqual(until),
      },
      order: { userId: 'ASC', validFrom: 'ASC' },
      select: ['userId', 'validFrom', 'minutesPerWeek'],
    });

    const byUser = new Map<string, UserCapacity[]>();
    for (const row of rows) {
      const existing = byUser.get(row.userId);
      if (existing) existing.push(row);
      else byUser.set(row.userId, [row]);
    }

    for (const userId of userIds) {
      timelines.set(
        userId,
        buildTimeline(byUser.get(userId) ?? [], fallback.minutesPerWeekOn),
      );
    }

    return timelines;
  }

  async timelineFor(
    companyId: string,
    userId: string,
    until: string,
  ): Promise<CapacityTimeline> {
    const timelines = await this.timelinesFor(companyId, [userId], until);
    return timelines.get(userId)!;
  }

  async minutesPerWeekOn(
    companyId: string,
    userId: string,
    date: string,
  ): Promise<number> {
    const timeline = await this.timelineFor(companyId, userId, date);
    return timeline.minutesPerWeekOn(date);
  }

  /**
   * The days each person can be expected to work, where the company is: from
   * the day their account was created, so someone who joins on a Wednesday is
   * not behind for Monday and Tuesday, except after a last working day until
   * they came back.
   */
  async activeDatesFor(
    companyId: string,
    userIds: string[],
    timezone: string,
  ): Promise<Map<string, ActiveDates>> {
    const activeDates = new Map<string, ActiveDates>();

    if (userIds.length === 0) return activeDates;

    const [users, inactivePeriods] = await Promise.all([
      this.userRepo.find({
        where: { companyId, id: In(userIds) },
        select: ['id', 'createdAt', 'status', 'lastWorkingDay'],
      }),
      this.inactivePeriodRepo.find({
        where: { companyId, userId: In(userIds) },
        select: ['userId', 'lastWorkingDay', 'firstDayBack'],
      }),
    ]);

    for (const user of users) {
      const inactiveSpells: InactiveSpell[] = inactivePeriods
        .filter((period) => period.userId === user.id)
        .map((period) => ({
          from: addDays(period.lastWorkingDay, 1),
          until: period.firstDayBack,
        }));
      if (user.status === UserStatus.DEACTIVATED && user.lastWorkingDay) {
        inactiveSpells.push({
          from: addDays(user.lastWorkingDay, 1),
          until: null,
        });
      }

      activeDates.set(user.id, {
        startDate: isoDateIn(user.createdAt, timezone),
        inactiveSpells,
      });
    }

    return activeDates;
  }

  /**
   * Refuses time or an absence dated when the person was not employed: after
   * their last working day, or inside a spell they were away for and came
   * back from. Nothing is expected of those days, so a record
   * there is always a mistake. Days before they left stay open to correction.
   */
  async assertEmployedOn(
    companyId: string,
    userId: string,
    from: string,
    to = from,
  ): Promise<void> {
    const { timezone } = await this.calendarFor(companyId);
    const activeDates = await this.activeDatesFor(
      companyId,
      [userId],
      timezone,
    );
    const overlapping = activeDates
      .get(userId)
      ?.inactiveSpells.find(
        (spell) =>
          spell.from <= to && (spell.until === null || spell.until > from),
      );

    if (!overlapping) return;

    throw new BadRequestException(
      overlapping.until === null
        ? `This person's last working day was ${addDays(overlapping.from, -1)}; nothing can be recorded after it`
        : `This person was deactivated from ${overlapping.from} and back on ${overlapping.until}; nothing can be recorded in between`,
    );
  }

  /** Today where the company is, so every view agrees on which day it is. */
  today(companyId: string): Promise<string> {
    return findCompanyToday(this.companyRepo.manager, companyId);
  }

  /** What the panel shows: the row in force today, or the company default, and what comes after it. */
  async currentFor(
    companyId: string,
    userId: string,
    onDate?: string,
  ): Promise<CurrentCapacity> {
    await this.findUserInCompany(companyId, userId);

    const today = await this.today(companyId);
    const date = onDate ?? today;

    const [row, next] = await Promise.all([
      this.repo.findOne({
        where: { companyId, userId, validFrom: LessThanOrEqual(date) },
        order: { validFrom: 'DESC' },
      }),
      this.repo.findOne({
        where: { companyId, userId, validFrom: MoreThan(today) },
        order: { validFrom: 'ASC' },
        select: ['validFrom', 'minutesPerWeek'],
      }),
    ]);
    const upcoming = next
      ? { validFrom: next.validFrom, minutesPerWeek: next.minutesPerWeek }
      : null;

    if (row) {
      return {
        userId,
        minutesPerWeek: row.minutesPerWeek,
        validFrom: row.validFrom,
        isCompanyDefault: false,
        upcoming,
      };
    }

    const { defaultTimeline } = await this.calendarFor(companyId);

    return {
      userId,
      minutesPerWeek: defaultTimeline.minutesPerWeekOn(date),
      validFrom: null,
      isCompanyDefault: true,
      upcoming,
    };
  }

  /**
   * Sets somebody's capacity from a date. Setting the same date twice replaces
   * that row rather than failing, so a typo can be corrected the same day.
   * A date after today replaces the change already scheduled, if any.
   */
  async setCapacity(
    companyId: string,
    userId: string,
    minutesPerWeek: number,
    validFrom: string,
    actorId: string,
  ): Promise<CurrentCapacity> {
    const user = await this.findUserInCompany(companyId, userId);

    // Their working hours are edited once they're reactivated.
    if (user.status === UserStatus.DEACTIVATED) {
      throw new BadRequestException(
        'Reactivate this person before changing their working hours.',
      );
    }

    const [today, { defaultTimeline }] = await Promise.all([
      this.today(companyId),
      this.calendarFor(companyId),
    ]);

    // The lock check runs inside the write's transaction, so a Close at the
    // same moment waits for it (see ReportingService.isRangeLocked).
    await this.repo.manager.transaction(async (manager) => {
      // A change effective on or before the last closed day would silently
      // rewrite what was expected of somebody in a month already signed off.
      const lockedUntil = await this.reportingService.latestLockedDate(
        companyId,
        manager,
      );

      if (lockedUntil && validFrom <= lockedUntil) {
        throw new ForbiddenException(
          `Cannot change capacity from ${validFrom}: periods are LOCKED up to ${lockedUntil}, and the change would alter what was expected then.`,
        );
      }

      // One change waits ahead at a time: scheduling another replaces it.
      // Saves for the same person queue on their row, so two can't both stay.
      await manager.findOne(User, {
        where: { id: userId, companyId },
        select: ['id'],
        lock: { mode: 'pessimistic_write' },
      });
      if (validFrom > today) {
        await manager.delete(UserCapacity, {
          companyId,
          userId,
          validFrom: MoreThan(today),
        });
      }

      const rows = await manager.find(UserCapacity, {
        where: { companyId, userId },
        order: { validFrom: 'ASC' },
      });
      const existing = rows.find((row) => row.validFrom === validFrom);
      const next = rows.find((row) => row.validFrom > validFrom);
      const hoursBefore = buildTimeline(
        rows,
        defaultTimeline.minutesPerWeekOn,
      ).minutesPerWeekOn(addDays(validFrom, -1));

      // Hours equal to the day before's are no change at all: nothing is
      // saved, and a change already on that day is removed.
      if (hoursBefore === minutesPerWeek) {
        if (existing) await manager.remove(existing);
      } else if (existing) {
        existing.minutesPerWeek = minutesPerWeek;
        existing.createdById = actorId;
        await manager.save(existing);
      } else {
        await manager.save(
          manager.create(UserCapacity, {
            companyId,
            userId,
            validFrom,
            minutesPerWeek,
            createdById: actorId,
          }),
        );
      }

      // A later change to these same hours no longer changes anything.
      if (next?.minutesPerWeek === minutesPerWeek) await manager.remove(next);
    });

    return this.currentFor(companyId, userId, validFrom);
  }

  /**
   * Cancels a change that hasn't started yet; the hours before it carry on.
   * One already in force is corrected by saving hours on its date instead.
   */
  async cancelUpcoming(
    companyId: string,
    userId: string,
    validFrom: string,
  ): Promise<CurrentCapacity> {
    const user = await this.findUserInCompany(companyId, userId);

    if (user.status === UserStatus.DEACTIVATED) {
      throw new BadRequestException(
        'Reactivate this person before changing their working hours.',
      );
    }

    if (validFrom <= (await this.today(companyId))) {
      throw new BadRequestException(
        'Only a change that starts after today can be cancelled; set the hours again to correct one in force.',
      );
    }

    const { affected } = await this.repo.delete({
      companyId,
      userId,
      validFrom,
    });
    if (!affected) {
      throw new NotFoundException('No working-hours change starts that day');
    }

    return this.currentFor(companyId, userId);
  }

  async standardDayFor(companyId: string): Promise<StandardDay> {
    const today = await this.today(companyId);
    const [company, current, upcoming] = await Promise.all([
      this.companyRepo.findOne({
        where: { id: companyId },
        select: ['id', 'standardWorkHoursPerDay'],
      }),
      this.standardDayRepo.findOne({
        where: { companyId, validFrom: LessThanOrEqual(today) },
        order: { validFrom: 'DESC' },
      }),
      this.standardDayRepo.findOne({
        where: { companyId, validFrom: MoreThan(today) },
        order: { validFrom: 'ASC' },
      }),
    ]);

    if (!company) throw new NotFoundException('Company not found');

    return {
      hoursPerDay: current?.hoursPerDay ?? company.standardWorkHoursPerDay,
      upcoming: upcoming
        ? { validFrom: upcoming.validFrom, hoursPerDay: upcoming.hoursPerDay }
        : null,
    };
  }

  /**
   * Sets the company's standard day from a date, the way a person's hours are
   * set: earlier days keep theirs, a locked month can't change, and a date
   * after today replaces the change already scheduled. Without a date it
   * applies from the company's start, as the setup guide sets it.
   */
  async setStandardDay(
    companyId: string,
    hoursPerDay: number,
    validFrom: string | null,
    actorId: string,
  ): Promise<StandardDay> {
    const today = await this.today(companyId);

    await this.repo.manager.transaction(async (manager) => {
      // Saves queue on the company's row, so two can't both stay scheduled.
      const company = await manager.findOne(Company, {
        where: { id: companyId },
        select: ['id', 'timezone', 'createdAt', 'standardWorkHoursPerDay'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!company) throw new NotFoundException('Company not found');

      // Months before the company existed lock too, but expected nothing.
      const from = validFrom ?? isoDateIn(company.createdAt, company.timezone);
      const lockedUntil = await this.reportingService.latestLockedDate(
        companyId,
        manager,
      );
      if (from <= lockedUntil) {
        throw new ForbiddenException(
          `The standard day can't change from ${from}: months up to ${lockedUntil} are locked, and their expected hours would change.`,
        );
      }

      if (validFrom !== null && validFrom > today) {
        await manager.delete(CompanyStandardDay, {
          companyId,
          validFrom: MoreThan(today),
        });
      }

      const changes = await manager.find(CompanyStandardDay, {
        where: { companyId },
        order: { validFrom: 'ASC' },
      });
      const next =
        validFrom === null
          ? changes[0]
          : changes.find((change) => change.validFrom > validFrom);
      const minutesPerWeek = minutesPerWeekOfDay(hoursPerDay);

      if (validFrom === null) {
        await manager.update(Company, companyId, {
          standardWorkHoursPerDay: hoursPerDay,
        });
      } else {
        const existing = changes.find(
          (change) => change.validFrom === validFrom,
        );
        const before = standardDayTimeline(
          company.standardWorkHoursPerDay,
          changes,
        ).minutesPerWeekOn(addDays(validFrom, -1));

        // The same day as the one before is no change: nothing is saved, and
        // a change already on that day is removed.
        if (before === minutesPerWeek) {
          if (existing) await manager.remove(existing);
        } else if (existing) {
          existing.hoursPerDay = hoursPerDay;
          existing.createdById = actorId;
          await manager.save(existing);
        } else {
          await manager.save(
            manager.create(CompanyStandardDay, {
              companyId,
              validFrom,
              hoursPerDay,
              createdById: actorId,
            }),
          );
        }
      }

      // A later change to this same day no longer changes anything.
      if (next && minutesPerWeekOfDay(next.hoursPerDay) === minutesPerWeek) {
        await manager.remove(next);
      }
    });

    return this.standardDayFor(companyId);
  }

  /** Cancels the standard day's scheduled change; the day before it carries on. */
  async cancelStandardDayChange(
    companyId: string,
    validFrom: string,
  ): Promise<StandardDay> {
    if (validFrom <= (await this.today(companyId))) {
      throw new BadRequestException(
        'Only a change that starts after today can be cancelled; set the standard day again to correct one in force.',
      );
    }

    const { affected } = await this.standardDayRepo.delete({
      companyId,
      validFrom,
    });
    if (!affected) {
      throw new NotFoundException('No standard-day change starts that day');
    }

    return this.standardDayFor(companyId);
  }

  private async findUserInCompany(
    companyId: string,
    userId: string,
  ): Promise<Pick<User, 'id' | 'status'>> {
    const user = await this.userRepo.findOne({
      where: { id: userId, companyId },
      select: ['id', 'status'],
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}

/**
 * The latest capacity change effective on the given date is used.
 * If there is no change yet, the fallback for that date is used.
 */
function buildTimeline(
  rows: Pick<UserCapacity, 'validFrom' | 'minutesPerWeek'>[],
  fallback: (date: string) => number,
): CapacityTimeline {
  const minutesPerWeekOn = (date: string): number => {
    let minutes = fallback(date);

    for (const row of rows) {
      if (row.validFrom > date) break;
      minutes = row.minutesPerWeek;
    }

    return minutes;
  };

  return {
    minutesPerWeekOn,
    minutesPerDayOn: (date) => minutesPerWeekOn(date) / WORKING_DAYS_PER_WEEK,
  };
}

const minutesPerWeekOfDay = (hoursPerDay: number) =>
  Math.round(hoursPerDay * 60) * WORKING_DAYS_PER_WEEK;

/** The company's standard day as a week's minutes on each date. */
function standardDayTimeline(
  hoursFromStart: number,
  changes: Pick<CompanyStandardDay, 'validFrom' | 'hoursPerDay'>[],
): CapacityTimeline {
  return buildTimeline(
    changes.map(({ validFrom, hoursPerDay }) => ({
      validFrom,
      minutesPerWeek: minutesPerWeekOfDay(hoursPerDay),
    })),
    () => minutesPerWeekOfDay(hoursFromStart),
  );
}
