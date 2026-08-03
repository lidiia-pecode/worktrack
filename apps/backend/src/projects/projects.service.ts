import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  ILike,
  Not,
  Repository,
} from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectActivity } from './entities/project-activity.entity';
import { User } from 'src/users/entities/user.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { UsersService } from 'src/users/users.service';
import { ActivitiesService } from 'src/activities/activities.service';
import {
  ProjectPayload,
  UpdateProjectPayload,
} from './dtos/ProjectPayload.dto';
import { ProjectsQuery } from './dtos/ProjectsQuery.dto';
import { Status } from '../enums/Status.enum';
import { AccessControlService } from 'src/auth/services/access-control.service';

@Injectable()
export class ProjectsService {
  private static readonly PROJECT_RELATIONS = [
    'owner',
    'users',
    'projectActivities',
    'projectActivities.activity',
    'projectActivities.activity.category',
  ];

  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    @InjectRepository(ProjectActivity)
    private readonly projectActivityRepo: Repository<ProjectActivity>,
    private readonly usersService: UsersService,
    private readonly activitiesService: ActivitiesService,
    private readonly accessControl: AccessControlService,
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------------------
  // PRIVATE HELPER METHODS & ASSERTS
  // ---------------------------------------------------------------------------

  private async assertUniqueName(
    name: string,
    excludeId?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Project) : this.repo;
    const exists = await repo.exists({
      where: {
        name: ILike(name.trim()),
        ...(excludeId && { id: Not(excludeId) }),
      },
    });

    if (exists) {
      throw new BadRequestException(
        `Project with name "${name}" already exists`,
      );
    }
  }

  private assertValidProjectMembers(users: User[]): void {
    if (users.some((user) => !this.accessControl.canBeProjectMember(user))) {
      throw new BadRequestException('User cannot be assigned to projects');
    }
  }

  private async findProject(
    where: FindOptionsWhere<Project>,
    manager?: EntityManager,
  ): Promise<Project> {
    const repo = manager ? manager.getRepository(Project) : this.repo;
    const project = await repo.findOne({
      where,
      relations: ProjectsService.PROJECT_RELATIONS,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private mergeProjectUsers(users: User[]): User[] {
    return Array.from(new Map(users.map((user) => [user.id, user])).values());
  }

  private buildListWhere(
    query: ProjectsQuery,
    user: User,
  ): FindOptionsWhere<Project> {
    if (this.accessControl.hasManagerPermissions(user)) {
      return {
        owner: { id: user.id },
        ...(query.status !== undefined && { status: query.status }),
      };
    }
    return {
      status: Status.ACTIVE,
      users: { id: user.id },
    };
  }

  private buildProjectWhere(id: string, user: User): FindOptionsWhere<Project> {
    if (this.accessControl.hasManagerPermissions(user)) {
      return { id, owner: { id: user.id } };
    }
    return { id, status: Status.ACTIVE, users: { id: user.id } };
  }

  private async syncProjectActivities(
    project: Project,
    targetActivityIds: string[],
    manager: EntityManager,
  ): Promise<void> {
    const activityRepo = manager.getRepository(Activity);
    const projectActivityRepo = manager.getRepository(ProjectActivity);

    const targetIdsSet = new Set(targetActivityIds);

    // 1. Отримуємо всі доступні цільові Activity
    const availableActivities = targetActivityIds.length
      ? await this.activitiesService.findActiveOrRestoreMany(
          targetActivityIds,
          activityRepo,
        )
      : [];
    const activitiesMap = new Map(
      availableActivities.map((act) => [act.id, act]),
    );

    // 2. Отримуємо поточні зв'язки проекту
    const existingProjectActivities = await projectActivityRepo.find({
      where: { project: { id: project.id } },
      relations: ['activity'],
    });
    const existingProjectActivitiesMap = new Map(
      existingProjectActivities.map((pa) => [pa.activity.id, pa]),
    );

    const entitiesToSave: ProjectActivity[] = [];

    // 3. Додаємо/активовуємо нові targetActivityIds
    for (const activityId of targetActivityIds) {
      const existing = existingProjectActivitiesMap.get(activityId);

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
              project,
              activity,
              isActive: true,
            }),
          );
        }
      }
    }

    // 4. Дективовуємо ті, які більше не входять у targetActivityIds
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

  // ---------------------------------------------------------------------------
  // PUBLIC HELPER METHODS & ASSERTS
  // ---------------------------------------------------------------------------
  assertProjectIsActive(project: Project): void {
    if (project.status !== Status.ACTIVE) {
      throw new BadRequestException('Project is archived');
    }
  }

  async getAccessibleProjectIds(user: User): Promise<string[]> {
    const where = this.accessControl.hasManagerPermissions(user)
      ? {
          owner: { id: user.id },
        }
      : {
          status: Status.ACTIVE,
          users: { id: user.id },
        };

    const projects = await this.repo.find({
      where,
      select: {
        id: true,
      },
    });

    return projects.map((project) => project.id);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  async list(query: ProjectsQuery, user: User) {
    const [results, count] = await this.repo.findAndCount({
      where: this.buildListWhere(query, user),
      relations: ProjectsService.PROJECT_RELATIONS,
      skip: query.offset,
      take: query.limit,
      order: {
        status: 'ASC',
        createdAt: 'DESC',
      },
    });

    return { results, count };
  }

  async getById(id: string, user: User): Promise<Project> {
    return this.findProject(this.buildProjectWhere(id, user));
  }

  async create(payload: ProjectPayload, user: User): Promise<Project> {
    this.accessControl.assertCanCreateProject(user);

    return this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);
      const userRepo = manager.getRepository(User);

      await this.assertUniqueName(payload.name, undefined, manager);

      const creator = await this.usersService.getUserById(user.id, userRepo);
      const additionalUsers = payload.userIds?.length
        ? await this.usersService.findUsersByIds(payload.userIds, userRepo)
        : [];

      const users = this.mergeProjectUsers([creator, ...additionalUsers]);
      this.assertValidProjectMembers(users);

      const project = await projectRepo.save(
        projectRepo.create({
          name: payload.name,
          description: payload.description,
          owner: creator,
          users,
        }),
      );

      if (payload.activityIds?.length) {
        await this.syncProjectActivities(project, payload.activityIds, manager);
      }

      return this.findProject({ id: project.id }, manager);
    });
  }

  async update(
    id: string,
    payload: UpdateProjectPayload,
    user: User,
  ): Promise<Project> {
    return this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);
      const userRepo = manager.getRepository(User);

      const project = await this.findProject(
        this.buildProjectWhere(id, user),
        manager,
      );

      this.accessControl.assertCanUpdateProject(user, project);

      if (payload.name !== undefined) {
        await this.assertUniqueName(payload.name, id, manager);
        project.name = payload.name;
      }

      if (payload.description !== undefined) {
        project.description = payload.description;
      }

      if (payload.userIds !== undefined) {
        if (payload.userIds.length === 0) {
          throw new BadRequestException('Project must have at least one user');
        }
        const users = await this.usersService.findUsersByIds(
          payload.userIds,
          userRepo,
        );
        this.assertValidProjectMembers(users);
        project.users = this.mergeProjectUsers([project.owner, ...users]);
      }

      await projectRepo.save(project);

      if (payload.activityIds !== undefined) {
        await this.syncProjectActivities(project, payload.activityIds, manager);
      }

      return this.findProject({ id: project.id }, manager);
    });
  }

  async archive(id: string, user: User): Promise<Project> {
    const project = await this.findProject(this.buildProjectWhere(id, user));
    this.accessControl.assertCanUpdateProject(user, project);

    this.assertProjectIsActive(project);
    project.status = Status.ARCHIVED;

    return this.repo.save(project);
  }

  async unarchive(id: string, user: User): Promise<Project> {
    const project = await this.findProject(this.buildProjectWhere(id, user));
    this.accessControl.assertCanUpdateProject(user, project);

    if (project.status === Status.ACTIVE) {
      throw new BadRequestException('Project is already active');
    }

    project.status = Status.ACTIVE;
    return this.repo.save(project);
  }

  async getAccessibleProjectActivity(
    projectActivityId: string,
    user: User,
  ): Promise<ProjectActivity> {
    const projectActivity = await this.projectActivityRepo.findOne({
      where: { id: projectActivityId },
      relations: ['project'],
    });

    if (!projectActivity) {
      throw new NotFoundException('Project activity not found');
    }
    if (!projectActivity.isActive) {
      throw new BadRequestException('Project activity is archived');
    }

    const hasAccess = await this.repo.exists({
      where: this.buildProjectWhere(projectActivity.projectId, user),
    });

    if (!hasAccess) {
      throw new NotFoundException('Project not found');
    }
    return projectActivity;
  }

  async listActivities(projectId: string, user: User) {
    await this.getById(projectId, user);

    const qb = this.projectActivityRepo
      .createQueryBuilder('pa')
      .leftJoinAndSelect('pa.activity', 'activity')
      .leftJoinAndSelect('activity.category', 'category')
      .where('pa.projectId = :projectId', { projectId });

    if (!this.accessControl.hasManagerPermissions(user)) {
      qb.andWhere('pa.isActive = true');
    }

    const [results, count] = await qb
      .orderBy('activity.name', 'ASC')
      .getManyAndCount();

    return { results, count };
  }
}
