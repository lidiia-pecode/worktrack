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

import { PlanningEntry } from './entities/planning-entry.entity';
import {
  CreatePlanningEntryDto,
  UpdatePlanningEntryDto,
} from './dtos/PlanningEntryPayload.dto';
import { PlanningQueryDto } from './dtos/PlanningQuery.dto';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/UserRole.enum';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(PlanningEntry)
    private readonly repo: Repository<PlanningEntry>,
    @InjectRepository(ProjectActivity)
    private readonly projectActivityRepo: Repository<ProjectActivity>,
    @InjectRepository(TeamMembership)
    private readonly teamMembershipRepo: Repository<TeamMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // QUERY BUILDING
  // ==========================================

  private buildBaseQuery(): SelectQueryBuilder<PlanningEntry> {
    return this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.projectActivity', 'projectActivity')
      .leftJoinAndSelect('projectActivity.project', 'project')
      .leftJoinAndSelect('projectActivity.activity', 'activity')
      .leftJoinAndSelect('activity.category', 'category');
  }

  /**
   * Tenant isolation: every query is scoped to the caller's company.
   */
  private applyTenantFilter(
    qb: SelectQueryBuilder<PlanningEntry>,
    companyId: string,
  ): void {
    qb.andWhere('p.company_id = :companyId', { companyId });
  }

  /**
   * Resource-scoped visibility per the authorization model:
   * - OWNER   -> company-wide
   * - MANAGER -> users on teams the manager actively manages
   * - EMPLOYEE -> own entries only
   */
  private applyVisibilityFilter(
    qb: SelectQueryBuilder<PlanningEntry>,
    user: AuthUser,
  ): void {
    this.applyTenantFilter(qb, user.companyId);

    if (user.role === UserRole.OWNER) return;

    if (user.role === UserRole.MANAGER) {
      qb.andWhere(
        `p.user_id IN (
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

    qb.andWhere('p.user_id = :userId', { userId: user.id });
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
    this.applyVisibilityFilter(qb, user);

    if (query.userId) {
      await this.assertUserVisible(query.userId, user);
      qb.andWhere('p.user_id = :userId', { userId: query.userId });
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

      const projectActivity = await this.resolveProjectActivity(
        payload.projectActivityId,
        user.companyId,
        manager,
      );

      await this.assertDailyLimit(
        manager,
        payload.userId,
        user.companyId,
        payload.date,
        payload.plannedMinutes,
      );

      const entity = manager.create(PlanningEntry, {
        companyId: user.companyId,
        userId: payload.userId,
        projectActivity,
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
            'A planning entry for this user, activity and date already exists. Edit the existing entry instead.',
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

      await this.lockUser(manager, entry.userId, user.companyId);

      if (payload.projectActivityId !== undefined) {
        entry.projectActivity = await this.resolveProjectActivity(
          payload.projectActivityId,
          user.companyId,
          manager,
        );
      }

      if (payload.plannedMinutes !== undefined) {
        entry.plannedMinutes = payload.plannedMinutes;
      }
      if (payload.note !== undefined) entry.note = payload.note;
      if (payload.date !== undefined) entry.date = payload.date;

      await this.assertDailyLimit(
        manager,
        entry.userId,
        user.companyId,
        entry.date,
        entry.plannedMinutes,
        id,
      );

      try {
        return await manager.save(PlanningEntry, entry);
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            'A planning entry for this user, activity and date already exists. Edit the existing entry instead.',
          );
        }
        throw error;
      }
    });
  }

  async delete(id: string, user: AuthUser): Promise<{ success: boolean }> {
    await this.dataSource.transaction(async (manager) => {
      const entry = await this.getEntryForUpdate(id, user, manager);
      await manager.remove(PlanningEntry, entry);
    });

    return { success: true };
  }

  // ==========================================
  // AUTHORIZATION HELPERS
  // ==========================================

  /**
   * Write access is stricter than read visibility:
   * - OWNER can plan for any active user in the company.
   * - MANAGER can plan for themselves or for users in teams they actively manage.
   */
  private async assertCanPlanForUser(
    targetUser: User,
    user: AuthUser,
  ): Promise<void> {
    if (user.role === UserRole.OWNER) return;

    if (targetUser.id === user.id) return;

    const manages = await this.teamMembershipRepo
      .createQueryBuilder('tm_mgr')
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
      .andWhere('tm_member.user_id = :targetUserId', {
        targetUserId: targetUser.id,
      })
      .andWhere('tm_member.left_at IS NULL')
      .andWhere('tm_member.company_id = :companyId')
      .andWhere('tm_mgr.company_id = :companyId', {
        companyId: user.companyId,
      })
      .getExists();

    if (!manages) {
      throw new ForbiddenException(
        'You can only plan for users in teams you manage',
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
        throw new ForbiddenException('You can only view your own planning');
      }
      return;
    }

    if (user.role === UserRole.MANAGER) {
      const visible = await this.isUserInManagedTeams(userId, user);
      if (!visible) {
        throw new ForbiddenException(
          'You can only view planning of users in teams you manage',
        );
      }
      return;
    }

    // OWNER: the target user must belong to the same company.
    const exists = await this.userRepo.exists({
      where: { id: userId, companyId: user.companyId },
    });
    if (!exists) throw new NotFoundException('User not found');
  }

  private async isUserInManagedTeams(
    userId: string,
    user: AuthUser,
  ): Promise<boolean> {
    return this.teamMembershipRepo
      .createQueryBuilder('tm_mgr')
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

  // ==========================================
  // VALIDATION / INTEGRITY HELPERS
  // ==========================================

  /**
   * Loads a planning entry by id + company and locks it for update.
   * Used by update/delete so entries can never cross company boundaries.
   */
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

  /**
   * Validates that a ProjectActivity exists, belongs to the caller's company,
   * and is currently available for planning.
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

    if (!pa || pa.companyId !== companyId) {
      throw new NotFoundException('Project activity not found');
    }

    if (
      !pa.isActive ||
      pa.project.status !== ProjectStatus.ACTIVE ||
      pa.activity.status !== ActivityStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Project activity is not available for planning',
      );
    }

    return pa;
  }

  /**
   * Loads an active user within the company.
   */
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
   * Total planned minutes for a user on a given date must not exceed 24 hours.
   */
  private async assertDailyLimit(
    manager: EntityManager,
    userId: string,
    companyId: string,
    date: string,
    minutes: number,
    excludeId?: string,
  ): Promise<void> {
    const qb = manager
      .createQueryBuilder(PlanningEntry, 'p')
      .select('COALESCE(SUM(p.planned_minutes), 0)', 'total')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.company_id = :companyId', { companyId })
      .andWhere('p.date = :date', { date });

    if (excludeId) {
      qb.andWhere('p.id != :excludeId', { excludeId });
    }

    const result = await qb.getRawOne<{ total: string | number }>();
    const total = Number(result?.total ?? 0);

    if (total + minutes > 1440) {
      throw new BadRequestException(
        'Daily planning limit exceeded (maximum 24 hours)',
      );
    }
  }
}
