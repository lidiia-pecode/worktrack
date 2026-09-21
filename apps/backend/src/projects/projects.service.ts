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
  ILike,
  Not,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectActivity } from './entities/project-activity.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActivitiesService } from 'src/activities/activities.service';
import { UsersService } from 'src/users/users.service';
import {
  ProjectPayload,
  UpdateProjectPayload,
} from './dtos/project-payload.dto';
import { ProjectsQuery } from './dtos/projects-query.dto';
import { AssignableActivitiesQuery } from './dtos/assignable-activities-query.dto';
import { PaginationQuery } from 'src/lib/dtos/pagination-query.dto';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { User } from 'src/users/entities/user.entity';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { ProjectStatus } from './enums/project-status.enum';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    @InjectRepository(ProjectActivity)
    private readonly projectActivityRepo: Repository<ProjectActivity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly activitiesService: ActivitiesService,
    private readonly usersService: UsersService,
    private readonly teamVisibility: TeamVisibilityService,
    private readonly dataSource: DataSource,
  ) {}

  private async assertUniqueName(
    companyId: string,
    name: string,
    excludeId?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Project) : this.repo;
    const exists = await repo.exists({
      where: {
        companyId,
        name: ILike(name.trim()),
        ...(excludeId && { id: Not(excludeId) }),
      },
    });

    if (exists) {
      throw new ConflictException(
        `Project with name "${name}" already exists in this company`,
      );
    }
  }

  private async syncProjectActivities(
    project: Project,
    rawActivityIds: string[],
    manager: EntityManager,
  ): Promise<void> {
    const targetActivityIds = Array.from(new Set(rawActivityIds));
    const activityRepo = manager.getRepository(Activity);
    const projectActivityRepo = manager.getRepository(ProjectActivity);

    const targetIdsSet = new Set(targetActivityIds);

    const availableActivities = targetActivityIds.length
      ? await this.activitiesService.findActiveOnlyMany(
          targetActivityIds,
          project.companyId,
          activityRepo,
        )
      : [];

    const activitiesMap = new Map(
      availableActivities.map((act) => [act.id, act]),
    );

    const existingProjectActivities = await projectActivityRepo.find({
      where: { project: { id: project.id } },
      relations: ['activity'],
    });
    const existingMap = new Map(
      existingProjectActivities.map((pa) => [pa.activity.id, pa]),
    );

    const entitiesToSave: ProjectActivity[] = [];

    for (const activityId of targetActivityIds) {
      const existing = existingMap.get(activityId);

      if (existing) {
        if (!existing.isActive) {
          existing.isActive = true;
          entitiesToSave.push(existing);
        }
      } else {
        const activity = activitiesMap.get(activityId);
        if (activity) {
          entitiesToSave.push(
            projectActivityRepo.create({
              companyId: project.companyId,
              project,
              activity,
              isActive: true,
            }),
          );
        }
      }
    }

    for (const pa of existingProjectActivities) {
      if (!targetIdsSet.has(pa.activity.id) && pa.isActive) {
        pa.isActive = false;
        entitiesToSave.push(pa);
      }
    }

    if (entitiesToSave.length > 0) {
      await projectActivityRepo.save(entitiesToSave);
    }
  }

  /**
   * Applies the submitted membership to the project.
   *
   * The caller only ever sees the people they may assign, so their list is
   * not the whole truth: both sides of the diff are bounded by that scope,
   * and members outside it are left alone rather than read as removals.
   */
  private async syncProjectUsers(
    project: Project,
    rawUserIds: string[],
    manager: EntityManager,
    user: AuthUser,
  ): Promise<void> {
    const targetUserIds = Array.from(new Set(rawUserIds));

    const targetUsers = targetUserIds.length
      ? await this.usersService.findActiveOnlyMany(
          targetUserIds,
          project.companyId,
        )
      : [];

    const targetIds = new Set(targetUsers.map((u) => u.id));

    const currentRows: Array<{ user_id: string }> = await manager
      .createQueryBuilder()
      .select('pu.user_id', 'user_id')
      .from('project_users', 'pu')
      .where('pu.project_id = :projectId', { projectId: project.id })
      .getRawMany();

    const currentIds = new Set(currentRows.map((row) => row.user_id));

    const idsToAdd = targetUsers
      .filter((u) => !currentIds.has(u.id))
      .map((u) => u.id);

    const removalCandidates = [...currentIds].filter(
      (id) => !targetIds.has(id),
    );

    const assignable = await this.teamVisibility.filterVisibleUserIds(
      [...idsToAdd, ...removalCandidates],
      user,
      { includeSelf: true },
    );

    if (idsToAdd.some((id) => !assignable.has(id))) {
      throw new ForbiddenException(
        'You can only assign yourself and users in teams you manage',
      );
    }

    const idsToRemove = removalCandidates.filter((id) => assignable.has(id));

    const relation = manager
      .createQueryBuilder()
      .relation(Project, 'users')
      .of(project.id);

    if (idsToAdd.length > 0) {
      await relation.add(idsToAdd);
    }

    if (idsToRemove.length > 0) {
      await relation.remove(idsToRemove);
    }
  }

  /** The project without its members, for reading and for mutation. */
  private async findOrFail(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<Project> {
    const repo = manager ? manager.getRepository(Project) : this.repo;
    const project = await repo.findOne({
      where: { id, companyId },
      relations: [
        'projectActivities',
        'projectActivities.activity',
        'projectActivities.activity.category',
      ],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  /** The project's members the caller may read — their own people, plus themselves. */
  private scopedMembersQuery(
    projectId: string,
    user: AuthUser,
    manager?: EntityManager,
  ): SelectQueryBuilder<User> {
    const repo = manager ? manager.getRepository(User) : this.userRepo;

    const qb = repo
      .createQueryBuilder('u')
      .innerJoin('project_users', 'pu', 'pu.user_id = u.id')
      .where('pu.project_id = :projectId', { projectId })
      .andWhere('u.companyId = :companyId', { companyId: user.companyId })
      .orderBy('u.firstName', 'ASC')
      .addOrderBy('u.lastName', 'ASC');

    this.teamVisibility.applyUserVisibility(qb, 'u.id', user, {
      includeSelf: true,
    });

    return qb;
  }

  private countMembers(
    projectId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(User) : this.userRepo;

    return repo
      .createQueryBuilder('u')
      .innerJoin('project_users', 'pu', 'pu.user_id = u.id')
      .where('pu.project_id = :projectId', { projectId })
      .getCount();
  }

  /**
   * Attaches the members this caller may read, plus the project's **true**
   * size, which a manager's shorter list would otherwise misreport.
   *
   * Only ever called on the way out. Saving a project whose `users` array is a
   * scoped subset would have TypeORM remove the members it does not hold.
   */
  private async withScopedMembers(
    project: Project,
    user: AuthUser,
    manager?: EntityManager,
  ): Promise<Project> {
    project.users = await this.scopedMembersQuery(
      project.id,
      user,
      manager,
    ).getMany();
    project.membersCount = await this.countMembers(project.id, manager);

    return project;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC METHODS
  // ---------------------------------------------------------------------------

  async list(query: ProjectsQuery, user: AuthUser) {
    // Members are counted, not loaded — the roster itself is only returned by
    // `getById` and `listUsers`.
    const qb = this.repo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.projectActivities', 'projectActivities')
      .leftJoinAndSelect('projectActivities.activity', 'activity')
      .loadRelationCountAndMap('project.membersCount', 'project.users')
      .where('project.companyId = :companyId', { companyId: user.companyId });

    if (query.status) {
      qb.andWhere('project.status = :status', { status: query.status });
    }

    const [results, count] = await qb
      .orderBy('project.createdAt', 'DESC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  async getById(id: string, user: AuthUser): Promise<Project> {
    const project = await this.findOrFail(id, user.companyId);

    return this.withScopedMembers(project, user);
  }

  async create(payload: ProjectPayload, user: AuthUser): Promise<Project> {
    return this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);

      await this.assertUniqueName(
        user.companyId,
        payload.name,
        undefined,
        manager,
      );

      const project = projectRepo.create({
        companyId: user.companyId,
        name: payload.name,
        clientName: payload.clientName ?? null,
        description: payload.description,
        status: ProjectStatus.ACTIVE,
      });

      let savedProject: Project;
      try {
        savedProject = await projectRepo.save(project);
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            `Project with name "${payload.name}" already exists in this company`,
          );
        }
        throw error;
      }

      if (payload.activityIds?.length) {
        await this.syncProjectActivities(
          savedProject,
          payload.activityIds,
          manager,
        );
      }

      if (payload.userIds?.length) {
        await this.syncProjectUsers(
          savedProject,
          payload.userIds,
          manager,
          user,
        );
      }

      return this.withScopedMembers(savedProject, user, manager);
    });
  }

  async update(
    id: string,
    payload: UpdateProjectPayload,
    user: AuthUser,
  ): Promise<Project> {
    return this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);
      const project = await this.findOrFail(id, user.companyId, manager);

      if (payload.name !== undefined) {
        await this.assertUniqueName(user.companyId, payload.name, id, manager);
        project.name = payload.name;
      }

      if (payload.clientName !== undefined) {
        project.clientName = payload.clientName;
      }

      if (payload.description !== undefined) {
        project.description = payload.description;
      }

      try {
        await projectRepo.save(project);
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            `Project with name "${payload.name}" already exists in this company`,
          );
        }
        throw error;
      }

      if (payload.activityIds !== undefined) {
        await this.syncProjectActivities(project, payload.activityIds, manager);
      }

      if (payload.userIds !== undefined) {
        await this.syncProjectUsers(project, payload.userIds, manager, user);
      }

      return this.withScopedMembers(
        await this.findOrFail(project.id, user.companyId, manager),
        user,
        manager,
      );
    });
  }

  async archive(id: string, user: AuthUser): Promise<Project> {
    const project = await this.findOrFail(id, user.companyId);
    if (project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException('Project is already archived');
    }

    project.status = ProjectStatus.ARCHIVED;
    await this.repo.save(project);

    return this.withScopedMembers(project, user);
  }

  async unarchive(id: string, user: AuthUser): Promise<Project> {
    const project = await this.findOrFail(id, user.companyId);
    if (project.status === ProjectStatus.ACTIVE) {
      throw new BadRequestException('Project is already active');
    }

    project.status = ProjectStatus.ACTIVE;
    await this.repo.save(project);

    return this.withScopedMembers(project, user);
  }

  /**
   * Project activities a person may log time against: the activity link is
   * enabled, both the project and the activity are active, and that person is
   * a member of the project. Defaults to the caller; owners and managers may
   * ask for someone they are allowed to write for.
   *
   * Exists so clients do not have to fetch every company project and filter
   * membership themselves — that leaked the whole project roster to employees
   * and silently truncated at the project page size.
   */
  async listAssignableActivities(
    query: AssignableActivitiesQuery,
    user: AuthUser,
  ) {
    const targetUserId = query.userId ?? user.id;

    if (targetUserId !== user.id) {
      await this.teamVisibility.assertCanActForUser(targetUserId, user, {
        action: 'list',
        subject: 'projects',
      });
    }

    const [results, count] = await this.projectActivityRepo
      .createQueryBuilder('pa')
      .innerJoinAndSelect('pa.project', 'project')
      .innerJoinAndSelect('pa.activity', 'activity')
      .leftJoinAndSelect('activity.category', 'category')
      .innerJoin(
        'project_users',
        'pu',
        'pu.project_id = project.id AND pu.user_id = :targetUserId',
        { targetUserId },
      )
      .where('pa.company_id = :companyId', { companyId: user.companyId })
      .andWhere('project.company_id = :companyId', {
        companyId: user.companyId,
      })
      .andWhere('pa.is_active = true')
      .andWhere('project.status = :projectStatus', {
        projectStatus: ProjectStatus.ACTIVE,
      })
      .andWhere('activity.status = :activityStatus', {
        activityStatus: ActivityStatus.ACTIVE,
      })
      .orderBy('project.name', 'ASC')
      .addOrderBy('activity.name', 'ASC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  /**
   * The project's members, scoped to the caller and paginated. `count` is the
   * scoped count this list needs to page through; the project's true size is
   * on `GET /projects/:id`.
   */
  async listUsers(projectId: string, query: PaginationQuery, user: AuthUser) {
    const exists = await this.repo.exists({
      where: { id: projectId, companyId: user.companyId },
    });

    if (!exists) {
      throw new NotFoundException('Project not found');
    }

    const [results, count] = await this.scopedMembersQuery(projectId, user)
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }
}
