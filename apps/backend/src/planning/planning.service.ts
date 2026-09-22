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
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { PlanningEntry } from './entities/planning-entry.entity';
import {
  CreatePlanningEntryDto,
  UpdatePlanningEntryDto,
} from './dtos/planning-entry-payload.dto';
import { PlanningQueryDto } from './dtos/planning-query.dto';
import { PlanningWeekQuery } from './dtos/planning-week-query.dto';
import { PlanningRemovalCountQuery } from './dtos/planning-removal-count-query.dto';
import { Company } from 'src/companies/entities/company.entity';
import { Project } from 'src/projects/entities/project.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import {
  TeamVisibilityService,
  VisibleUser,
} from 'src/teams/team-visibility.service';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { ReportingService } from 'src/reporting/reporting.service';
import { ReportingPeriodStatus } from 'src/reporting/enums/reporting-period-status.enum';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import {
  isWorkingDay,
  todayISODate,
  weekRange,
} from 'src/capacity/working-days.util';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import type { AuthUser } from 'src/auth/auth-strategies/types';

type PlanningCompany = Pick<
  Company,
  'id' | 'timezone' | 'weekStartDay' | 'standardWorkHoursPerDay'
>;

interface PlannedSlot {
  date: string;
  minutes: number;
}

export interface PlanningWeekRow {
  user: VisibleUser;
  plannedMinutes: number;
  availableMinutes: number;
  projects: Pick<Project, 'id' | 'name'>[];
  entries: PlanningEntry[];
}

export interface PlanningWeek {
  weekStart: string;
  weekEnd: string;
  dayLimitMinutes: number;
  rows: PlanningWeekRow[];
}

const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const dayLimitMinutes = (company: PlanningCompany): number =>
  Math.round(Number(company.standardWorkHoursPerDay) * 60);

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(PlanningEntry)
    private readonly repo: Repository<PlanningEntry>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly teamVisibility: TeamVisibilityService,
    private readonly reportingService: ReportingService,
    private readonly expectedHours: ExpectedHoursService,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // QUERY BUILDING
  // ==========================================

  private buildBaseQuery(): SelectQueryBuilder<PlanningEntry> {
    return this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.project', 'project');
  }

  private applyTenantFilter(
    qb: SelectQueryBuilder<PlanningEntry>,
    companyId: string,
  ): void {
    qb.andWhere('p.company_id = :companyId', { companyId });
  }

  private applyVisibilityFilter(
    qb: SelectQueryBuilder<PlanningEntry>,
    user: AuthUser,
  ): void {
    this.applyTenantFilter(qb, user.companyId);
    this.teamVisibility.applyUserVisibility(qb, 'p.user_id', user);
  }

  /**
   * The entries that removing these people from these projects would delete:
   * from today onwards, never inside a locked period. The cascade and the
   * count shown before it share this, so the number shown is the number
   * deleted.
   */
  private applyRemovableFilter(
    qb: SelectQueryBuilder<PlanningEntry>,
    companyId: string,
    projectIds: string[],
    userIds: string[],
    today: string,
  ): void {
    qb.andWhere('p.company_id = :removableCompanyId', {
      removableCompanyId: companyId,
    })
      .andWhere('p.project_id IN (:...removableProjectIds)', {
        removableProjectIds: projectIds,
      })
      .andWhere('p.user_id IN (:...removableUserIds)', {
        removableUserIds: userIds,
      })
      .andWhere('p.date >= :removableFrom', { removableFrom: today })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM project_users pu
          WHERE pu.project_id = p.project_id AND pu.user_id = p.user_id
        )`,
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM reporting_periods rp
          WHERE rp.company_id = p.company_id
            AND rp.status = :removableLocked
            AND p.date BETWEEN rp.start_date AND rp.end_date
        )`,
        { removableLocked: ReportingPeriodStatus.LOCKED },
      );
  }

  // ==========================================
  // READ
  // ==========================================

  async list(
    query: PlanningQueryDto,
    user: AuthUser,
  ): Promise<{ results: PlanningEntry[]; count: number }> {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo');
    }

    const qb = this.buildBaseQuery();

    if (query.userId === user.id) {
      this.applyTenantFilter(qb, user.companyId);
      qb.andWhere('p.user_id = :userId', { userId: user.id });
    } else {
      this.applyVisibilityFilter(qb, user);

      if (query.userId) {
        await this.assertUserVisible(query.userId, user);
        qb.andWhere('p.user_id = :userId', { userId: query.userId });
      }
    }

    if (query.projectId) {
      qb.andWhere('project.id = :projectId', { projectId: query.projectId });
    }

    if (query.date) {
      qb.andWhere('p.date = :date', { date: query.date });
    } else {
      if (query.dateFrom) {
        qb.andWhere('p.date >= :from', { from: query.dateFrom });
      }
      if (query.dateTo) {
        qb.andWhere('p.date <= :to', { to: query.dateTo });
      }
    }

    const [results, count] = await qb
      .orderBy('p.date', 'DESC')
      .addOrderBy('p.createdAt', 'DESC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  /**
   * One week of the grid: a row per visible person, with their entries, the
   * week's planned minutes and the minutes they have available that week.
   */
  async getWeek(
    query: PlanningWeekQuery,
    user: AuthUser,
  ): Promise<PlanningWeek> {
    const company = await this.getCompany(user.companyId);
    const { start, end } = weekRange(query.date, company.weekStartDay);

    const entriesQb = this.buildBaseQuery()
      .andWhere('p.date BETWEEN :start AND :end', { start, end })
      .orderBy('project.name', 'ASC');
    this.applyVisibilityFilter(entriesQb, user);
    const entries = await entriesQb.getMany();

    const users = await this.teamVisibility.findVisibleUsers(user, {
      teamId: query.teamId,
      includeUserIds: [...new Set(entries.map((entry) => entry.userId))],
    });
    const userIds = users.map((row) => row.id);

    const [available, projectsByUser] = await Promise.all([
      this.expectedHours.expectedFor(user.companyId, userIds, start, end),
      this.activeProjectsFor(user.companyId, userIds),
    ]);

    const rows = users.map((rowUser): PlanningWeekRow => {
      const own = entries.filter((entry) => entry.userId === rowUser.id);

      return {
        user: rowUser,
        plannedMinutes: own.reduce((sum, e) => sum + e.plannedMinutes, 0),
        availableMinutes: available.get(rowUser.id)?.total ?? 0,
        projects: projectsByUser.get(rowUser.id) ?? [],
        entries: own,
      };
    });

    return {
      weekStart: start,
      weekEnd: end,
      dayLimitMinutes: dayLimitMinutes(company),
      rows,
    };
  }

  /** How many entries removing these people from these projects would delete. */
  async countRemovable(
    query: PlanningRemovalCountQuery,
    user: AuthUser,
  ): Promise<{ count: number }> {
    // The same people the membership update is allowed to remove.
    const removable = await this.teamVisibility.filterVisibleUserIds(
      query.userIds,
      user,
      { includeSelf: true },
    );
    if (removable.size === 0) return { count: 0 };

    const company = await this.getCompany(user.companyId);
    const qb = this.repo.createQueryBuilder('p');
    this.applyRemovableFilter(
      qb,
      user.companyId,
      query.projectIds,
      [...removable],
      todayISODate(company.timezone),
    );

    return { count: await qb.getCount() };
  }

  async getById(id: string, user: AuthUser): Promise<PlanningEntry> {
    const qb = this.buildBaseQuery().where('p.id = :id', { id });
    this.applyVisibilityFilter(qb, user);

    const entry = await qb.getOne();
    if (!entry) throw new NotFoundException('Planning entry not found');
    return entry;
  }

  // ==========================================
  // WRITE
  // ==========================================

  async create(
    payload: CreatePlanningEntryDto,
    user: AuthUser,
  ): Promise<PlanningEntry> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, payload.userId, user.companyId);

      const targetUser = await this.getActiveUser(
        payload.userId,
        user.companyId,
        manager,
      );

      await this.assertCanPlanForUser(targetUser, user);

      this.assertWorkingDay(payload.date);
      await this.assertDateNotLocked(user.companyId, payload.date);

      const project = await this.resolveProject(
        payload.projectId,
        user.companyId,
        manager,
      );
      await this.assertProjectMember(manager, project.id, payload.userId);

      const company = await this.getCompany(user.companyId, manager);
      await this.assertWithinLimits(manager, company, payload.userId, {
        date: payload.date,
        minutes: payload.plannedMinutes,
      });

      const entity = manager.create(PlanningEntry, {
        companyId: user.companyId,
        userId: payload.userId,
        project,
        createdById: user.id,
        plannedMinutes: payload.plannedMinutes,
        note: payload.note,
        date: payload.date,
      });

      try {
        return await manager.save(entity);
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            'A planning entry for this user, project and date already exists. Edit the existing entry instead.',
          );
        }
        throw error;
      }
    });
  }

  async update(
    id: string,
    payload: UpdatePlanningEntryDto,
    user: AuthUser,
  ): Promise<PlanningEntry> {
    return this.dataSource.transaction(async (manager) => {
      const entry = await this.getEntryForUpdate(id, user, manager);

      const targetUser = await this.getActiveUser(
        entry.userId,
        user.companyId,
        manager,
      );
      await this.assertCanPlanForUser(targetUser, user);

      await this.lockUser(manager, entry.userId, user.companyId);

      await this.assertDateNotLocked(user.companyId, entry.date);

      const current = await manager.findOne(Project, {
        where: { id: entry.projectId, companyId: user.companyId },
      });
      if (current?.status !== ProjectStatus.ACTIVE) {
        throw new BadRequestException(
          'This entry is on an archived project and can only be deleted',
        );
      }

      const previous: PlannedSlot = {
        date: entry.date,
        minutes: entry.plannedMinutes,
      };

      const movesDate =
        payload.date !== undefined && payload.date !== entry.date;
      const movesProject =
        payload.projectId !== undefined &&
        payload.projectId !== entry.projectId;
      const changesMinutes =
        payload.plannedMinutes !== undefined &&
        payload.plannedMinutes !== entry.plannedMinutes;

      if (movesDate) {
        entry.date = payload.date!;
        await this.assertDateNotLocked(user.companyId, entry.date);
      }

      if (movesProject) {
        const project = await this.resolveProject(
          payload.projectId!,
          user.companyId,
          manager,
        );
        entry.project = project;
        entry.projectId = project.id;
      }

      if (changesMinutes) entry.plannedMinutes = payload.plannedMinutes!;
      if (payload.note !== undefined) entry.note = payload.note;

      if (movesDate || movesProject || changesMinutes) {
        this.assertWorkingDay(entry.date);
        await this.assertProjectMember(manager, entry.projectId, entry.userId);

        const company = await this.getCompany(user.companyId, manager);
        await this.assertWithinLimits(
          manager,
          company,
          entry.userId,
          { date: entry.date, minutes: entry.plannedMinutes },
          { excludeId: id, previous },
        );
      }

      try {
        return await manager.save(PlanningEntry, entry);
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            'A planning entry for this user, project and date already exists. Edit the existing entry instead.',
          );
        }
        throw error;
      }
    });
  }

  async delete(id: string, user: AuthUser): Promise<{ success: boolean }> {
    await this.dataSource.transaction(async (manager) => {
      const entry = await this.getEntryForUpdate(id, user, manager);

      // A deactivated person's leftover plans can still be cleared.
      const targetUser = await manager.findOne(User, {
        where: { id: entry.userId, companyId: user.companyId },
      });
      if (!targetUser) throw new NotFoundException('User not found');

      await this.assertCanPlanForUser(targetUser, user);
      await this.assertDateNotLocked(user.companyId, entry.date);

      await manager.remove(PlanningEntry, entry);
    });

    return { success: true };
  }

  /**
   * Called when people leave a project, inside the membership transaction and
   * before their `project_users` rows go. Past plans stay for reporting.
   */
  async deleteForRemovedMembers(
    manager: EntityManager,
    companyId: string,
    projectId: string,
    userIds: string[],
  ): Promise<void> {
    if (userIds.length === 0) return;

    const company = await this.getCompany(companyId, manager);
    const qb = manager
      .getRepository(PlanningEntry)
      .createQueryBuilder('p')
      .select('p.id');
    this.applyRemovableFilter(
      qb,
      companyId,
      [projectId],
      userIds,
      todayISODate(company.timezone),
    );

    const ids = (await qb.getMany()).map((entry) => entry.id);
    if (ids.length > 0) {
      await manager.delete(PlanningEntry, { id: In(ids) });
    }
  }

  // ==========================================
  // AUTHORIZATION HELPERS
  // ==========================================

  private async assertCanPlanForUser(
    targetUser: User,
    user: AuthUser,
  ): Promise<void> {
    if (user.role === UserRole.OWNER) return;

    if (user.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException('Employees cannot change planning');
    }

    if (targetUser.id === user.id) return;

    const manages = await this.teamVisibility.isUserInManagedTeams(
      targetUser.id,
      user,
    );

    if (!manages) {
      throw new ForbiddenException(
        'You can only plan for users in teams you manage',
      );
    }
  }

  private async assertUserVisible(
    userId: string,
    user: AuthUser,
  ): Promise<void> {
    if (user.role === UserRole.EMPLOYEE) {
      if (userId !== user.id) {
        throw new ForbiddenException('You can only view your own planning');
      }
      return;
    }

    if (user.role === UserRole.MANAGER) {
      const visible = await this.teamVisibility.isUserInManagedTeams(
        userId,
        user,
      );
      if (!visible) {
        throw new ForbiddenException(
          'You can only view planning of users in teams you manage',
        );
      }
      return;
    }

    const exists = await this.userRepo.exists({
      where: { id: userId, companyId: user.companyId },
    });
    if (!exists) throw new NotFoundException('User not found');
  }

  // ==========================================
  // VALIDATION / INTEGRITY HELPERS
  // ==========================================

  private async getEntryForUpdate(
    id: string,
    user: AuthUser,
    manager: EntityManager,
  ): Promise<PlanningEntry> {
    const entry = await manager.findOne(PlanningEntry, {
      where: { id, companyId: user.companyId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!entry) throw new NotFoundException('Planning entry not found');
    return entry;
  }

  private async getCompany(
    companyId: string,
    manager?: EntityManager,
  ): Promise<PlanningCompany> {
    const repo = (manager ?? this.dataSource.manager).getRepository(Company);
    const company = await repo.findOne({
      where: { id: companyId },
      select: ['id', 'timezone', 'weekStartDay', 'standardWorkHoursPerDay'],
    });

    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  private async activeProjectsFor(
    companyId: string,
    userIds: string[],
  ): Promise<Map<string, Pick<Project, 'id' | 'name'>[]>> {
    const byUser = new Map<string, Pick<Project, 'id' | 'name'>[]>();
    if (userIds.length === 0) return byUser;

    const rows = await this.projectRepo
      .createQueryBuilder('project')
      .innerJoin('project_users', 'pu', 'pu.project_id = project.id')
      .select('pu.user_id', 'userId')
      .addSelect('project.id', 'id')
      .addSelect('project.name', 'name')
      .where('project.company_id = :companyId', { companyId })
      .andWhere('project.status = :status', { status: ProjectStatus.ACTIVE })
      .andWhere('pu.user_id IN (:...userIds)', { userIds })
      .orderBy('project.name', 'ASC')
      .getRawMany<{ userId: string; id: string; name: string }>();

    for (const { userId, id, name } of rows) {
      const existing = byUser.get(userId);
      if (existing) existing.push({ id, name });
      else byUser.set(userId, [{ id, name }]);
    }

    return byUser;
  }

  private async resolveProject(
    projectId: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<Project> {
    const repo = manager ? manager.getRepository(Project) : this.projectRepo;

    const project = await repo.findOne({ where: { id: projectId } });

    if (!project || project.companyId !== companyId) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException('Project is not available for planning');
    }

    return project;
  }

  private async assertProjectMember(
    manager: EntityManager,
    projectId: string,
    userId: string,
  ): Promise<void> {
    const rows: unknown[] = await manager.query(
      'SELECT 1 FROM project_users WHERE project_id = $1 AND user_id = $2',
      [projectId, userId],
    );

    if (rows.length === 0) {
      throw new BadRequestException(
        'This person is not a member of the project. Add them to it before planning.',
      );
    }
  }

  private assertWorkingDay(date: string): void {
    if (!isWorkingDay(date)) {
      throw new BadRequestException(
        'Planning is only possible Monday to Friday',
      );
    }
  }

  private async assertDateNotLocked(
    companyId: string,
    date: string,
  ): Promise<void> {
    if (await this.reportingService.isDateLocked(companyId, date)) {
      throw new ForbiddenException(
        `Cannot change planning for ${date} because it belongs to a LOCKED reporting period.`,
      );
    }
  }

  private async getActiveUser(
    userId: string,
    companyId: string,
    manager: EntityManager,
  ): Promise<User> {
    const user = await manager.findOne(User, {
      where: { id: userId, companyId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        'Planning can only be created for active users',
      );
    }

    return user;
  }

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

  private async plannedMinutesBetween(
    manager: EntityManager,
    userId: string,
    companyId: string,
    from: string,
    to: string,
    excludeId?: string,
  ): Promise<number> {
    const qb = manager
      .createQueryBuilder(PlanningEntry, 'p')
      .select('COALESCE(SUM(p.planned_minutes), 0)', 'total')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.company_id = :companyId', { companyId })
      .andWhere('p.date BETWEEN :from AND :to', { from, to });

    if (excludeId) {
      qb.andWhere('p.id != :excludeId', { excludeId });
    }

    const result = await qb.getRawOne<{ total: string | number }>();
    return Number(result?.total ?? 0);
  }

  /**
   * A write may not raise the day above the company's working day, or the week
   * above the hours the person has available. A week can already be over
   * either limit after an absence or a capacity change, so a write that does
   * not raise the total is always allowed.
   */
  private async assertWithinLimits(
    manager: EntityManager,
    company: PlanningCompany,
    userId: string,
    next: PlannedSlot,
    options: { excludeId?: string; previous?: PlannedSlot } = {},
  ): Promise<void> {
    const { excludeId, previous } = options;
    const week = weekRange(next.date, company.weekStartDay);

    const previousIn = (from: string, to: string): number =>
      previous && previous.date >= from && previous.date <= to
        ? previous.minutes
        : 0;

    const otherDay = await this.plannedMinutesBetween(
      manager,
      userId,
      company.id,
      next.date,
      next.date,
      excludeId,
    );
    const dayLimit = dayLimitMinutes(company);
    const nextDay = otherDay + next.minutes;

    if (
      nextDay > dayLimit &&
      nextDay > otherDay + previousIn(next.date, next.date)
    ) {
      throw new BadRequestException(
        `Daily planning limit exceeded: ${formatMinutes(Math.max(0, dayLimit - otherDay))} left on ${next.date} of a ${formatMinutes(dayLimit)} working day.`,
      );
    }

    const otherWeek = await this.plannedMinutesBetween(
      manager,
      userId,
      company.id,
      week.start,
      week.end,
      excludeId,
    );
    const nextWeek = otherWeek + next.minutes;

    if (nextWeek <= otherWeek + previousIn(week.start, week.end)) return;

    const { total: available } = await this.expectedHours.expectedForUser(
      company.id,
      userId,
      week.start,
      week.end,
    );

    if (nextWeek > available) {
      throw new BadRequestException(
        `Weekly planning limit exceeded: ${formatMinutes(Math.max(0, available - otherWeek))} left of ${formatMinutes(available)} available in the week of ${week.start}.`,
      );
    }
  }
}
