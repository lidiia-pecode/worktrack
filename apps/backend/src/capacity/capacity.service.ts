import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';

import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { ReportingService } from 'src/reporting/reporting.service';

import { UserCapacity } from './entities/user-capacity.entity';
import { WORKING_DAYS_PER_WEEK } from './working-days.util';

export interface CapacityTimeline {
  minutesPerWeekOn(date: string): number;
}

export interface CurrentCapacity {
  userId: string;
  minutesPerWeek: number;
  validFrom: string | null;
  isCompanyDefault: boolean;
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
    private readonly reportingService: ReportingService,
  ) {}

  async defaultMinutesPerWeek(companyId: string): Promise<number> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      select: ['id', 'standardWorkHoursPerDay'],
    });

    if (!company) throw new NotFoundException('Company not found');

    return (
      Math.round(company.standardWorkHoursPerDay * 60) * WORKING_DAYS_PER_WEEK
    );
  }

  /**
   * Builds capacity timelines for multiple users in one query
   * to avoid querying the database separately for each user.
   */
  async timelinesFor(
    companyId: string,
    userIds: string[],
    until: string,
  ): Promise<Map<string, CapacityTimeline>> {
    const fallback = await this.defaultMinutesPerWeek(companyId);
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
      timelines.set(userId, buildTimeline(byUser.get(userId) ?? [], fallback));
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

  /** What the form shows: the row in force today, or the company default. */
  async currentFor(
    companyId: string,
    userId: string,
    onDate: string,
  ): Promise<CurrentCapacity> {
    await this.assertUserInCompany(companyId, userId);

    const row = await this.repo.findOne({
      where: { companyId, userId, validFrom: LessThanOrEqual(onDate) },
      order: { validFrom: 'DESC' },
    });

    if (row) {
      return {
        userId,
        minutesPerWeek: row.minutesPerWeek,
        validFrom: row.validFrom,
        isCompanyDefault: false,
      };
    }

    return {
      userId,
      minutesPerWeek: await this.defaultMinutesPerWeek(companyId),
      validFrom: null,
      isCompanyDefault: true,
    };
  }

  /**
   * Sets somebody's capacity from a date. Setting the same date twice replaces
   * that row rather than failing, so a typo can be corrected the same day.
   */
  async setCapacity(
    companyId: string,
    userId: string,
    minutesPerWeek: number,
    validFrom: string,
    actorId: string,
  ): Promise<CurrentCapacity> {
    await this.assertUserInCompany(companyId, userId);

    const isLocked = await this.reportingService.isDateLocked(
      companyId,
      validFrom,
    );

    if (isLocked) {
      throw new ForbiddenException(
        `Cannot change capacity from ${validFrom} because that date falls in a LOCKED reporting period.`,
      );
    }

    const existing = await this.repo.findOne({
      where: { companyId, userId, validFrom },
    });

    if (existing) {
      existing.minutesPerWeek = minutesPerWeek;
      existing.createdById = actorId;
      await this.repo.save(existing);
    } else {
      await this.repo.save(
        this.repo.create({
          companyId,
          userId,
          validFrom,
          minutesPerWeek,
          createdById: actorId,
        }),
      );
    }

    return this.currentFor(companyId, userId, validFrom);
  }

  private async assertUserInCompany(
    companyId: string,
    userId: string,
  ): Promise<void> {
    const exists = await this.userRepo.findOne({
      where: { id: userId, companyId },
      select: ['id'],
    });

    if (!exists) throw new NotFoundException('User not found');
  }
}

/**
 * The latest capacity change effective on the given date is used.
 * If there is no change yet, the company default is used.
 */
function buildTimeline(
  rows: Pick<UserCapacity, 'validFrom' | 'minutesPerWeek'>[],
  fallback: number,
): CapacityTimeline {
  return {
    minutesPerWeekOn(date: string): number {
      let minutes = fallback;

      for (const row of rows) {
        if (row.validFrom > date) break;
        minutes = row.minutesPerWeek;
      }

      return minutes;
    },
  };
}
