import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { TimeLog } from './entities/time-log.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { User } from 'src/users/entities/user.entity';
import {
  TeamVisibilityService,
  VisibleUser,
} from 'src/teams/team-visibility.service';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import { ReportingService } from 'src/reporting/reporting.service';
import {
  TimeLogPayload,
  UpdateTimeLogPayload,
} from './dtos/time-log-payload.dto';
import { TimeLogsQuery } from './dtos/time-logs-query.dto';
import { TeamSummaryQuery } from './dtos/team-summary-query.dto';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';

interface DailyMinutesRaw {
  userId: string;
  date: string;
  minutes: string | number | null;
  billableMinutes: string | number | null;
}

export interface TeamSummaryDay {
  date: string;
  minutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
}

export interface TeamSummaryRow {
  user: VisibleUser;
  minutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  expectedMinutes: number;
  expectedToDateMinutes: number;
  days: TeamSummaryDay[];
}

export interface TeamSummary {
  dateFrom: string;
  dateTo: string;
  minutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  rows: TeamSummaryRow[];
}

@Injectable()
export class TimeLogsService {
  constructor(
    @InjectRepository(TimeLog)
    private readonly repo: Repository<TimeLog>,
    @InjectRepository(ProjectActivity)
    private readonly projectActivityRepo: Repository<ProjectActivity>,
    private readonly reportingService: ReportingService,
    private readonly teamVisibility: TeamVisibilityService,
    private readonly expectedHours: ExpectedHoursService,
    private readonly dataSource: DataSource,
  ) {}

  private buildBaseQuery(): SelectQueryBuilder<TimeLog> {
    return this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.projectActivity', 'projectActivity')
      .leftJoinAndSelect('projectActivity.project', 'project')
      .leftJoinAndSelect('projectActivity.activity', 'activity')
      .leftJoinAndSelect('activity.category', 'category');
  }

  /**
   * Tenant isolation: every query is scoped to the caller's company.
   */
  private applyTenantFilter(
    qb: SelectQueryBuilder<TimeLog>,
    companyId: string,
  ): void {
    qb.andWhere('t.company_id = :companyId', { companyId });
  }

  private applyVisibilityFilter(
    qb: SelectQueryBuilder<TimeLog>,
    user: AuthUser,
  ): void {
    this.applyTenantFilter(qb, user.companyId);
    this.teamVisibility.applyUserVisibility(qb, 't.user_id', user);
  }

  // ==========================================
  // READ
  // ==========================================

  async list(
    query: TimeLogsQuery,
    user: AuthUser,
  ): Promise<{ results: TimeLog[]; count: number }> {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo');
    }

    const qb = this.buildBaseQuery();
    this.applyVisibilityFilter(qb, user);

    if (query.userId) {
      await this.assertUserVisible(query.userId, user);
      qb.andWhere('t.user_id = :userId', { userId: query.userId });
    }

    if (query.projectId) {
      qb.andWhere('project.id = :projectId', { projectId: query.projectId });
    }

    if (query.date) {
      qb.andWhere('t.date = :date', { date: query.date });
    } else {
      if (query.dateFrom) {
        qb.andWhere('t.date >= :from', { from: query.dateFrom });
      }
      if (query.dateTo) {
        qb.andWhere('t.date <= :to', { to: query.dateTo });
      }
    }

    const [results, count] = await qb
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  async getById(id: string, user: AuthUser): Promise<TimeLog> {
    const qb = this.buildBaseQuery().where('t.id = :id', { id });
    this.applyVisibilityFilter(qb, user);

    const log = await qb.getOne();
    if (!log) throw new NotFoundException('TimeLog not found');
    return log;
  }

  /**
   * One row per user the caller may see, with a per-day breakdown and the
   * billable split. Summing happens in the database, not in the browser.
   */
  async getTeamSummary(
    query: TeamSummaryQuery,
    user: AuthUser,
  ): Promise<TeamSummary> {
    if (query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo');
    }

    const dailyTotals = await this.aggregateDailyMinutes(query, user);

    const loggedUserIds = [...new Set(dailyTotals.map((row) => row.userId))];
    const users = await this.teamVisibility.findVisibleUsers(user, {
      teamId: query.teamId,
      projectId: query.projectId,
      includeUserIds: loggedUserIds,
    });

    const expected = await this.expectedHours.expectedFor(
      user.companyId,
      users.map((summaryUser) => summaryUser.id),
      query.dateFrom,
      query.dateTo,
    );

    const rows = new Map<string, TeamSummaryRow>(
      users.map((summaryUser) => [
        summaryUser.id,
        {
          user: summaryUser,
          minutes: 0,
          billableMinutes: 0,
          nonBillableMinutes: 0,
          expectedMinutes: expected.get(summaryUser.id)?.total ?? 0,
          expectedToDateMinutes: expected.get(summaryUser.id)?.toDate ?? 0,
          days: [],
        },
      ]),
    );

    for (const raw of dailyTotals) {
      const row = rows.get(raw.userId);
      if (!row) continue;

      const minutes = Number(raw.minutes) || 0;
      const billableMinutes = Number(raw.billableMinutes) || 0;
      const nonBillableMinutes = minutes - billableMinutes;

      row.days.push({
        date: raw.date,
        minutes,
        billableMinutes,
        nonBillableMinutes,
      });

      row.minutes += minutes;
      row.billableMinutes += billableMinutes;
      row.nonBillableMinutes += nonBillableMinutes;
    }

    const results = [...rows.values()];

    return {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      minutes: results.reduce((total, row) => total + row.minutes, 0),
      billableMinutes: results.reduce(
        (total, row) => total + row.billableMinutes,
        0,
      ),
      nonBillableMinutes: results.reduce(
        (total, row) => total + row.nonBillableMinutes,
        0,
      ),
      rows: results,
    };
  }

  // ==========================================
  // WRITE (Optimized & Deadlock-free)
  // ==========================================

  async create(payload: TimeLogPayload, user: AuthUser): Promise<TimeLog> {
    const ownerId = payload.userId ?? user.id;
    await this.assertCanWriteFor(ownerId, user);

    await this.assertDateNotLocked(user.companyId, payload.date);

    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, ownerId, user.companyId);

      const projectActivity = await this.resolveProjectActivity(
        payload.projectActivityId,
        ownerId,
        user,
        manager,
      );

      await this.assertNotAbsent(
        manager,
        ownerId,
        user.companyId,
        payload.date,
      );

      await this.assertDailyLimit(
        manager,
        ownerId,
        user.companyId,
        payload.date,
        payload.minutes,
      );

      const finalIsBillable =
        payload.isBillable ?? projectActivity.activity.defaultBillable;

      const entity = manager.create(TimeLog, {
        companyId: user.companyId,
        userId: ownerId,
        projectActivity,
        isBillable: finalIsBillable,
        minutes: payload.minutes,
        note: payload.note,
        date: payload.date,
      });

      return manager.save(entity);
    });
  }

  async update(
    id: string,
    payload: UpdateTimeLogPayload,
    user: AuthUser,
  ): Promise<TimeLog> {
    const ownerId = await this.resolveWritableOwner(id, user);

    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, ownerId, user.companyId);

      const log = await this.getLogForUpdate(id, user.companyId, manager);

      // 1. Reporting Period Check for existing and new target dates
      await this.assertDateNotLocked(user.companyId, log.date);
      if (payload.date && payload.date !== log.date) {
        await this.assertDateNotLocked(user.companyId, payload.date);
        await this.assertNotAbsent(
          manager,
          ownerId,
          user.companyId,
          payload.date,
        );
      }

      if (payload.projectActivityId !== undefined) {
        log.projectActivity = await this.resolveProjectActivity(
          payload.projectActivityId,
          ownerId,
          user,
          manager,
        );
      }

      if (payload.minutes !== undefined) log.minutes = payload.minutes;
      if (payload.isBillable !== undefined) log.isBillable = payload.isBillable;
      if (payload.note !== undefined) log.note = payload.note;
      if (payload.date !== undefined) log.date = payload.date;

      await this.assertDailyLimit(
        manager,
        ownerId,
        user.companyId,
        log.date,
        log.minutes,
        id,
      );

      return manager.save(TimeLog, log);
    });
  }

  async delete(id: string, user: AuthUser): Promise<{ success: boolean }> {
    const ownerId = await this.resolveWritableOwner(id, user);

    await this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, ownerId, user.companyId);
      const log = await this.getLogForUpdate(id, user.companyId, manager);

      // Reporting Period Check
      await this.assertDateNotLocked(user.companyId, log.date);

      await manager.remove(TimeLog, log);
    });

    return { success: true };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Minutes per user per day for the range, split by billability.
   */
  private async aggregateDailyMinutes(
    query: TeamSummaryQuery,
    user: AuthUser,
  ): Promise<DailyMinutesRaw[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('t.user_id', 'userId')
      .addSelect(`TO_CHAR(t.date, 'YYYY-MM-DD')`, 'date')
      .addSelect('SUM(t.minutes)', 'minutes')
      .addSelect(
        'SUM(CASE WHEN t.is_billable = true THEN t.minutes ELSE 0 END)',
        'billableMinutes',
      )
      .from('time_logs', 't')
      .where('t.company_id = :companyId', { companyId: user.companyId })
      .andWhere('t.date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });

    this.teamVisibility.applyUserVisibility(qb, 't.user_id', user);
    this.teamVisibility.applyTeamMembershipFilter(
      qb,
      't.user_id',
      query.teamId,
      user,
    );

    if (query.projectId) {
      qb.innerJoin(
        'project_activities',
        'pa',
        'pa.id = t.project_activity_id',
      ).andWhere('pa.project_id = :projectId', { projectId: query.projectId });
    }

    return qb
      .groupBy('t.user_id')
      .addGroupBy('t.date')
      .orderBy('t.date', 'ASC')
      .getRawMany<DailyMinutesRaw>();
  }

  /**
   * Verifies that the date is not part of a LOCKED reporting period.
   */
  private async assertDateNotLocked(
    companyId: string,
    date: string,
  ): Promise<void> {
    const isLocked = await this.reportingService.isDateLocked(companyId, date);
    if (isLocked) {
      throw new ForbiddenException(
        `Cannot modify time logs for date ${date} because it belongs to a LOCKED reporting period.`,
      );
    }
  }

  /**
   * Who the entry belongs to, once the caller is allowed to write for them.
   * Read before the transaction so the owner's row is the one locked, rather
   * than the caller's.
   */
  private async resolveWritableOwner(
    id: string,
    user: AuthUser,
  ): Promise<string> {
    const log = await this.repo.findOne({
      where: { id, companyId: user.companyId },
      select: ['id', 'userId'],
    });

    if (!log) throw new NotFoundException('TimeLog not found');

    await this.assertCanWriteFor(log.userId, user);

    return log.userId;
  }

  private async getLogForUpdate(
    id: string,
    companyId: string,
    manager: EntityManager,
  ): Promise<TimeLog> {
    const log = await manager.findOne(TimeLog, {
      where: { id, companyId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!log) throw new NotFoundException('TimeLog not found');
    return log;
  }

  /**
   * Validates that a ProjectActivity exists, belongs to the caller's company,
   * is assigned to the caller, and is currently available for time logging.
   */
  private async resolveProjectActivity(
    projectActivityId: string,
    ownerId: string,
    user: AuthUser,
    manager?: EntityManager,
  ): Promise<ProjectActivity> {
    const repo = manager
      ? manager.getRepository(ProjectActivity)
      : this.projectActivityRepo;

    const pa = await repo.findOne({
      where: { id: projectActivityId },
      relations: ['project', 'activity'],
    });

    if (!pa || pa.companyId !== user.companyId) {
      throw new NotFoundException('Project activity not found');
    }

    await this.assertProjectMembership(pa.projectId, ownerId, user, manager);

    if (
      !pa.isActive ||
      pa.project.status !== ProjectStatus.ACTIVE ||
      pa.activity.status !== ActivityStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Project activity is not available for time logging',
      );
    }

    return pa;
  }

  private async assertProjectMembership(
    projectId: string,
    ownerId: string,
    user: AuthUser,
    manager?: EntityManager,
  ): Promise<void> {
    const runner = manager ?? this.dataSource;

    const isMember = await runner
      .createQueryBuilder()
      .select('1')
      .from('project_users', 'pu')
      .where('pu.project_id = :projectId', { projectId })
      .andWhere('pu.user_id = :ownerId', { ownerId })
      .getExists();

    if (!isMember) {
      throw new ForbiddenException(
        ownerId === user.id
          ? 'You can only log time against projects you are assigned to'
          : 'That user is not assigned to this project',
      );
    }
  }

  /**
   * Serializes writes per user by locking the user row, so concurrent
   * create/update operations cannot race the daily-total computation.
   */
  private async lockUser(
    manager: EntityManager,
    userId: string,
    companyId: string,
  ): Promise<void> {
    const user = await manager
      .createQueryBuilder(User, 'u')
      .setLock('pessimistic_write')
      .where('u.id = :userId', { userId })
      .andWhere('u.company_id = :companyId', { companyId })
      .getOne();

    if (!user) throw new NotFoundException('User not found');
  }

  /**
   * A day is either worked or absent, never both. Absences are read straight
   * from their table so the two services do not have to depend on each other.
   */
  private async assertNotAbsent(
    manager: EntityManager,
    userId: string,
    companyId: string,
    date: string,
  ): Promise<void> {
    const isAbsent = await manager
      .createQueryBuilder()
      .select('1')
      .from('absences', 'a')
      .where('a.company_id = :companyId', { companyId })
      .andWhere('a.user_id = :userId', { userId })
      .andWhere(':date BETWEEN a.start_date AND a.end_date', { date })
      .getExists();

    if (isAbsent) {
      throw new ConflictException(
        `${date} is covered by an absence, so time cannot be logged for it.`,
      );
    }
  }

  private async assertDailyLimit(
    manager: EntityManager,
    userId: string,
    companyId: string,
    date: string,
    minutes: number,
    excludeId?: string,
  ): Promise<void> {
    const qb = manager
      .createQueryBuilder(TimeLog, 't')
      .select('COALESCE(SUM(t.minutes), 0)', 'total')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.company_id = :companyId', { companyId })
      .andWhere('t.date = :date', { date });

    if (excludeId) {
      qb.andWhere('t.id != :excludeId', { excludeId });
    }

    const result = await qb.getRawOne<{ total: string | number }>();
    const total = Number(result?.total ?? 0);

    if (total + minutes > 1440) {
      throw new BadRequestException(
        'Daily time limit exceeded (maximum 24 hours)',
      );
    }
  }

  /** Verifies the caller may filter by a specific user id. */
  private assertUserVisible(userId: string, user: AuthUser): Promise<void> {
    return this.teamVisibility.assertCanActForUser(userId, user, {
      action: 'view',
      subject: 'time logs',
    });
  }

  /**
   * Verifies the caller may write an entry belonging to someone else
   * Write scope mirrors read scope, so both go through the same check.
   */
  private assertCanWriteFor(ownerId: string, user: AuthUser): Promise<void> {
    if (ownerId === user.id) return Promise.resolve();

    return this.teamVisibility.assertCanActForUser(ownerId, user, {
      action: 'change',
      subject: 'time logs',
    });
  }
}
