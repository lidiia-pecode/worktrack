import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { DataSource, ILike, Not, Repository } from 'typeorm';
import {
  ProjectPayload,
  UpdateProjectPayload,
} from './dtos/ProjectPayload.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { Status } from '../enums/Status.enum';
import { ActivitiesService } from 'src/activities/activities.service';
import { ProjectActivity } from './entities/project-activity.entity';
import { ProjectsQuery } from './dtos/ProjectsQuery.dto';
import { Activity } from 'src/activities/entities/activity.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,

    @InjectRepository(ProjectActivity)
    private readonly projectActivityRepo: Repository<ProjectActivity>,

    private readonly usersService: UsersService,
    private readonly activitiesService: ActivitiesService,

    private readonly dataSource: DataSource,
  ) {}

  private assertManagerAccess(user: User) {
    if (!this.usersService.hasManagerAccess(user)) {
      throw new ForbiddenException(
        'Only managers are allowed to perform this action',
      );
    }
  }

  private async assertUniqueName(
    name: string,
    excludeId?: string,
    repo: Repository<Project> = this.repo,
  ) {
    const exists = await repo.exists({
      where: {
        name: ILike(name.trim()),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (exists) {
      throw new BadRequestException(
        `Project with name "${name}" already exists`,
      );
    }
  }

  async assertUserHasAccess(projectId: string, user: User) {
    const hasAccess = await this.repo.exists({
      where: {
        id: projectId,
        status: Status.ACTIVE,
        users: { id: user.id },
      },
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        'Project is not active or you are not assigned to it',
      );
    }
  }

  async assertProjectAccess(projectId: string, user: User) {
    if (this.usersService.hasManagerAccess(user)) {
      return this.getByIdRaw(projectId);
    }
    await this.assertUserHasAccess(projectId, user);
    return this.getByIdRaw(projectId);
  }

  assertProjectIsActive(project: Project) {
    if (project.status !== Status.ACTIVE) {
      throw new BadRequestException('Project is archived');
    }
  }

  async getProjectActivityForUser(projectActivityId: string, user: User) {
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

    await this.assertUserHasAccess(projectActivity.projectId, user);

    return projectActivity;
  }

  private async syncProjectActivities(
    project: Project,
    activityIds: string[],
    activityRepo: Repository<Activity>,
    projectActivityRepo: Repository<ProjectActivity>,
  ) {
    const activities = activityIds.length
      ? await this.activitiesService.findActiveOrRestoreMany(
          activityIds,
          activityRepo,
        )
      : [];

    const activitiesMap = new Map(
      activities.map((activity) => [activity.id, activity]),
    );

    const existingProjectActivities = await projectActivityRepo.find({
      where: {
        project: {
          id: project.id,
        },
      },
      relations: ['activity'],
    });

    const existingMap = new Map(
      existingProjectActivities.map((pa) => [pa.activity.id, pa]),
    );

    const entitiesToSave: ProjectActivity[] = [];

    for (const activityId of activityIds) {
      const existing = existingMap.get(activityId);

      if (existing) {
        if (!existing.isActive) {
          existing.isActive = true;
          entitiesToSave.push(existing);
        }

        continue;
      }

      const activity = activitiesMap.get(activityId);

      if (!activity) {
        continue;
      }

      entitiesToSave.push(
        projectActivityRepo.create({
          project,
          activity,
          isActive: true,
        }),
      );
    }

    const activityIdsSet = new Set(activityIds);

    for (const projectActivity of existingProjectActivities) {
      if (
        !activityIdsSet.has(projectActivity.activity.id) &&
        projectActivity.isActive
      ) {
        projectActivity.isActive = false;
        entitiesToSave.push(projectActivity);
      }
    }

    if (entitiesToSave.length) {
      await projectActivityRepo.save(entitiesToSave);
    }
  }

  // -------------------------
  // LIST
  // -------------------------
  async list(query: ProjectsQuery, user: User) {
    const isManager = this.usersService.hasManagerAccess(user);

    const where = isManager
      ? query.status !== undefined
        ? { status: query.status }
        : {}
      : {
          status: Status.ACTIVE,
          users: { id: user.id },
        };

    const [results, count] = await this.repo.findAndCount({
      where,
      relations: [
        'users',
        'projectActivities',
        'projectActivities.activity',
        'projectActivities.activity.category',
      ],
      skip: query.offset,
      take: query.limit,
      order: {
        status: 'ASC',
        createdAt: 'DESC',
      },
    });

    return { results, count };
  }

  // -------------------------
  // GET ONE RAW
  // -------------------------

  async getByIdRaw(id: string, repo: Repository<Project> = this.repo) {
    const project = await repo.findOne({
      where: { id },
      relations: [
        'users',
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

  // -------------------------
  // GET ONE
  // -------------------------

  async getById(id: string, user: User) {
    const where = this.usersService.hasManagerAccess(user)
      ? { id }
      : { id, users: { id: user.id }, status: Status.ACTIVE };

    const project = await this.repo.findOne({
      where,
      relations: [
        'users',
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

  // -------------------------
  // CREATE
  // -------------------------

  async create(payload: ProjectPayload, user: User) {
    return this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);
      const projectActivityRepo = manager.getRepository(ProjectActivity);
      const userRepo = manager.getRepository(User);
      const activityRepo = manager.getRepository(Activity);

      this.assertManagerAccess(user);

      await this.assertUniqueName(payload.name, undefined, projectRepo);

      const creator = await this.usersService.getUserById(user.id, userRepo);

      const additionalUsers = payload.userIds?.length
        ? await this.usersService.findUsersByIds(payload.userIds, userRepo)
        : [];

      const users = [
        ...new Map(
          [...additionalUsers, creator].map((u) => [u.id, u]),
        ).values(),
      ];

      if (users.some((u) => !this.usersService.canBeProjectMember(u))) {
        throw new BadRequestException('User cannot be assigned to projects');
      }

      const project = await projectRepo.save(
        projectRepo.create({
          name: payload.name,
          description: payload.description,
          users,
        }),
      );

      await this.syncProjectActivities(
        project,
        payload.activityIds ?? [],
        activityRepo,
        projectActivityRepo,
      );

      return this.getByIdRaw(project.id, projectRepo);
    });
  }
  // -------------------------
  // UPDATE
  // -------------------------
  async update(id: string, payload: UpdateProjectPayload, user: User) {
    return this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);
      const projectActivityRepo = manager.getRepository(ProjectActivity);
      const userRepo = manager.getRepository(User);
      const activityRepo = manager.getRepository(Activity);

      this.assertManagerAccess(user);

      const project = await this.getByIdRaw(id, projectRepo);

      if (payload.name !== undefined) {
        await this.assertUniqueName(payload.name, id, projectRepo);
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

        if (users.some((u) => !this.usersService.canBeProjectMember(u))) {
          throw new BadRequestException('User cannot be assigned to projects');
        }

        project.users = users;
      }

      await projectRepo.save(project);

      if (payload.activityIds !== undefined) {
        await this.syncProjectActivities(
          project,
          payload.activityIds,
          activityRepo,
          projectActivityRepo,
        );
      }

      return this.getByIdRaw(project.id, projectRepo);
    });
  }

  // -------------------------
  // ARCHIVE (soft delete)
  // -------------------------
  async archive(id: string, user: User) {
    this.assertManagerAccess(user);
    const project = await this.getById(id, user);
    this.assertProjectIsActive(project);

    project.status = Status.ARCHIVED;

    return this.repo.save(project);
  }

  // -------------------------
  // RESTORE (soft delete)
  // -------------------------

  async unarchive(id: string, user: User) {
    this.assertManagerAccess(user);
    const project = await this.getById(id, user);

    if (project.status === Status.ACTIVE) {
      throw new BadRequestException('Project is already active');
    }

    project.status = Status.ACTIVE;

    return this.repo.save(project);
  }

  async listActivities(projectId: string, user: User) {
    const project = await this.assertProjectAccess(projectId, user);
    this.assertProjectIsActive(project);

    const qb = this.projectActivityRepo
      .createQueryBuilder('pa')
      .leftJoinAndSelect('pa.activity', 'activity')
      .leftJoinAndSelect('activity.category', 'category')
      .where('pa.project_id = :projectId', { projectId });

    if (!this.usersService.hasManagerAccess(user)) {
      qb.andWhere('pa.is_active = true');
    }

    const [results, count] = await qb
      .orderBy('activity.name', 'ASC')
      .getManyAndCount();

    return {
      results,
      count,
    };
  }
}
