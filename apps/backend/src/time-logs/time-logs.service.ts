import {
  BadRequestException,
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
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import {
  TimeLogPayload,
  UpdateTimelogPayload,
} from './dtos/TimelogPayload.dto';
import { GetTimelogsQuery } from './dtos/GetTimelogsQuery.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Injectable()
export class TimeLogsService {
  constructor(
    @InjectRepository(TimeLog)
    private readonly repo: Repository<TimeLog>,
    @InjectRepository(ProjectActivity)
    private readonly projectActivityRepo: Repository<ProjectActivity>,
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

  /**
   * Resource-scoped visibility per the authorization model:
   * - OWNER  -> company-wide
   * - MANAGER -> users on teams the manager actively manages
   * - EMPLOYEE -> own logs only
   */
  private applyVisibilityFilter(
    qb: SelectQueryBuilder<TimeLog>,
    user: AuthUser,
  ): void {
    this.applyTenantFilter(qb, user.companyId);

    if (user.role === UserRole.OWNER) return;

    if (user.role === UserRole.MANAGER) {
      qb.andWhere(
        `t.user_id IN (
          SELECT tm_member.user_id
          FROM team_memberships tm_mgr
          JOIN team_memberships tm_member ON tm_member.team_id = tm_mgr.team_id
          WHERE tm_mgr.user_id = :managerId
            AND tm_mgr.role_in_team = :managerRole
            AND tm_mgr.left_at IS NULL
            AND tm_member.left_at IS NULL
            AND tm_mgr.company_id = :companyId
            AND tm_member.company_id = :companyId
        )`,
        {
          managerId: user.id,
          managerRole: TeamRole.MANAGER,
          companyId: user.companyId,
        },
      );
      return;
    }

    qb.andWhere('t.user_id = :userId', { userId: user.id });
  }

  // ==========================================
  // READ
  // ==========================================

  async list(
    query: GetTimelogsQuery,
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

  // ==========================================
  // WRITE (Optimized & Deadlock-free)
  // ==========================================

  async create(payload: TimeLogPayload, user: AuthUser): Promise<TimeLog> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, user.id, user.companyId);

      const projectActivity = await this.resolveProjectActivity(
        payload.projectActivityId,
        user.companyId,
        manager,
      );

      await this.assertDailyLimit(
        manager,
        user.id,
        user.companyId,
        payload.date,
        payload.minutes,
      );

      const entity = manager.create(TimeLog, {
        companyId: user.companyId,
        userId: user.id,
        projectActivity,
        isBillable: payload.isBillable,
        minutes: payload.minutes,
        note: payload.note,
        date: payload.date,
      });

      return manager.save(entity);
    });
  }

  async update(
    id: string,
    payload: UpdateTimelogPayload,
    user: AuthUser,
  ): Promise<TimeLog> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, user.id, user.companyId);

      const log = await this.getOwnedLogForUpdate(id, user, manager);

      if (payload.projectActivityId !== undefined) {
        log.projectActivity = await this.resolveProjectActivity(
          payload.projectActivityId,
          user.companyId,
          manager,
        );
      }

      if (payload.minutes !== undefined) log.minutes = payload.minutes;
      if (payload.isBillable !== undefined) log.isBillable = payload.isBillable;
      if (payload.note !== undefined) log.note = payload.note;
      if (payload.date !== undefined) log.date = payload.date;

      await this.assertDailyLimit(
        manager,
        user.id,
        user.companyId,
        log.date,
        log.minutes,
        id,
      );

      return manager.save(TimeLog, log);
    });
  }

  async delete(id: string, user: AuthUser): Promise<{ success: boolean }> {
    await this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, user.id, user.companyId);
      const log = await this.getOwnedLogForUpdate(id, user, manager);
      await manager.remove(TimeLog, log);
    });

    return { success: true };
  }

  private async getOwnedLogForUpdate(
    id: string,
    user: AuthUser,
    manager: EntityManager,
  ): Promise<TimeLog> {
    const log = await manager.findOne(TimeLog, {
      where: { id, userId: user.id, companyId: user.companyId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!log) throw new NotFoundException('TimeLog not found');
    return log;
  }

  /**
   * Validates that a ProjectActivity exists, belongs to the caller's company,
   * and is currently available for time logging.
   */
  private async resolveProjectActivity(
    projectActivityId: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<ProjectActivity> {
    const repo = manager
      ? manager.getRepository(ProjectActivity)
      : this.projectActivityRepo;

    const pa = await repo.findOne({
      where: { id: projectActivityId },
      relations: ['project', 'activity'],
    });

    if (!pa || pa.project.companyId !== companyId) {
      throw new NotFoundException('Project activity not found');
    }

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

  /**
   * Verifies the caller is allowed to filter by a specific user id.
   */
  private async assertUserVisible(
    userId: string,
    user: AuthUser,
  ): Promise<void> {
    if (user.role === UserRole.EMPLOYEE) {
      if (userId !== user.id) {
        throw new ForbiddenException('You can only view your own time logs');
      }
      return;
    }

    if (user.role === UserRole.MANAGER) {
      const visible = await this.isUserInManagedTeams(userId, user);
      if (!visible) {
        throw new ForbiddenException(
          'You can only view time logs of users in teams you manage',
        );
      }
      return;
    }

    // OWNER: the target user must belong to the same company.
    const exists = await this.dataSource
      .getRepository(User)
      .exists({ where: { id: userId, companyId: user.companyId } });
    if (!exists) throw new NotFoundException('User not found');
  }

  private async isUserInManagedTeams(
    userId: string,
    user: AuthUser,
  ): Promise<boolean> {
    return this.dataSource
      .createQueryBuilder(TeamMembership, 'tm_mgr')
      .innerJoin(
        TeamMembership,
        'tm_member',
        'tm_member.team_id = tm_mgr.team_id',
      )
      .where('tm_mgr.user_id = :managerId', { managerId: user.id })
      .andWhere('tm_mgr.role_in_team = :managerRole', {
        managerRole: TeamRole.MANAGER,
      })
      .andWhere('tm_mgr.left_at IS NULL')
      .andWhere('tm_member.user_id = :userId', { userId })
      .andWhere('tm_member.left_at IS NULL')
      .andWhere('tm_member.company_id = :companyId')
      .andWhere('tm_mgr.company_id = :companyId', {
        companyId: user.companyId,
      })
      .getExists();
  }
}
