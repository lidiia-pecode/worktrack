import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ILike, Not, Repository } from 'typeorm';
import {
  ProjectPayload,
  UpdateProjectPayload,
} from './dtos/ProjectPayload.dto';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { ProjectStatus } from './enums/ProjectStatus.enum';
import { ActivitiesService } from 'src/activities/activities.service';
import { ProjectActivityPayload } from './dtos/ProjectActivity.dto';
import { ProjectActivity } from './entities/project-activity.entity';
import { UserRole } from 'src/users/enums/UserRole.enum';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,

    @InjectRepository(ProjectActivity)
    private readonly projectActivityRepo: Repository<ProjectActivity>,

    private readonly usersService: UsersService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  private assertManagerAccess(user: User) {
    if (!this.usersService.hasManagerAccess(user)) {
      throw new ForbiddenException(
        'Only managers are allowed to perform this action',
      );
    }
  }

  private async assertUniqueName(name: string, excludeId?: string) {
    const exists = await this.repo.exists({
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
        status: ProjectStatus.ACTIVE,
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

  private assertProjectIsActive(project: Project) {
    if (project.status !== ProjectStatus.ACTIVE) {
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

  // -------------------------
  // LIST
  // -------------------------
  async list(pagination: PaginationQuery, user: User) {
    const where = this.usersService.hasManagerAccess(user)
      ? {}
      : {
          status: ProjectStatus.ACTIVE,
          users: { id: user.id },
        };

    const [results, count] = await this.repo.findAndCount({
      where,
      relations: ['users'],
      skip: pagination.offset,
      take: pagination.limit,
      order: { createdAt: 'DESC' },
    });

    return { results, count };
  }

  // -------------------------
  // GET ONE RAW
  // -------------------------

  async getByIdRaw(id: string) {
    const project = await this.repo.findOne({
      where: { id },
      relations: ['users', 'projectActivities'],
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
      : { id, users: { id: user.id } };

    const project = await this.repo.findOne({
      where,
      relations: ['users'],
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
    await this.assertUniqueName(payload.name);

    const creator = await this.usersService.getUserById(user.id);
    const extraUsers = payload.userIds?.length
      ? await this.usersService.findUsersByIds(payload.userIds)
      : [];

    const uniqueUsers = [creator, ...extraUsers].filter(
      (u, index, self) => self.findIndex((item) => item.id === u.id) === index,
    );

    const project = this.repo.create({
      name: payload.name,
      description: payload.description,
      status: ProjectStatus.ACTIVE,
      users: uniqueUsers,
    });

    return this.repo.save(project);
  }

  // -------------------------
  // UPDATE
  // -------------------------
  async update(id: string, payload: UpdateProjectPayload, user: User) {
    const project = await this.getById(id, user);

    if (payload.name) {
      await this.assertUniqueName(payload.name, id);
      project.name = payload.name;
    }

    if (payload.description !== undefined) {
      project.description = payload.description;
    }

    if (payload.userIds?.length) {
      const users = payload.userIds.length
        ? await this.usersService.findUsersByIds(payload.userIds)
        : [];

      if (users.some((u) => u.role !== UserRole.USER)) {
        throw new BadRequestException(
          'Only employees can be assigned to projects',
        );
      }

      project.users = users;
    }

    return this.repo.save(project);
  }

  // -------------------------
  // ARCHIVE (soft delete)
  // -------------------------
  async archive(id: string, user: User) {
    const project = await this.getById(id, user);
    this.assertProjectIsActive(project);

    project.status = ProjectStatus.ARCHIVED;

    return this.repo.save(project);
  }

  // -------------------------
  // RESTORE (soft delete)
  // -------------------------

  async unarchive(id: string, user: User) {
    const project = await this.getById(id, user);

    if (project.status === ProjectStatus.ACTIVE) {
      throw new BadRequestException('Project is already active');
    }

    project.status = ProjectStatus.ACTIVE;

    return this.repo.save(project);
  }

  async assignUserToProject(
    projectId: string,
    userId: string,
    requester: User,
  ) {
    this.assertManagerAccess(requester);

    const project = await this.getByIdRaw(projectId);
    this.assertProjectIsActive(project);

    const alreadyAssigned = project.users.some((u) => u.id === userId);

    if (alreadyAssigned) {
      throw new BadRequestException('User is already assigned to this project');
    }

    const user = await this.usersService.getUserById(userId);
    if (user.role !== UserRole.USER) {
      throw new BadRequestException(
        'Only employees can be assigned to projects',
      );
    }
    project.users.push(user);
    return this.repo.save(project);
  }

  async unassignUserFromProject(
    projectId: string,
    userId: string,
    requester: User,
  ) {
    this.assertManagerAccess(requester);

    const project = await this.getByIdRaw(projectId);
    this.assertProjectIsActive(project);

    const originalLength = project.users.length;

    project.users = project.users.filter((u) => u.id !== userId);

    if (project.users.length === originalLength) {
      throw new BadRequestException('User is not assigned to this project');
    }

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

  async addActivity(
    projectId: string,
    payload: ProjectActivityPayload,
    user: User,
  ) {
    this.assertManagerAccess(user);

    const project = await this.getByIdRaw(projectId);
    this.assertProjectIsActive(project);

    const activity = await this.activitiesService.findRaw(payload.activityId);

    const existing = await this.projectActivityRepo.findOne({
      where: {
        project: { id: project.id },
        activity: { id: activity.id },
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('Activity already assigned');
      }

      existing.isActive = true;
      return this.projectActivityRepo.save(existing);
    }

    const entity = this.projectActivityRepo.create({ project, activity });
    return this.projectActivityRepo.save(entity);
  }

  async archiveActivity(
    projectId: string,
    projectActivityId: string,
    user: User,
  ) {
    this.assertManagerAccess(user);

    const project = await this.getByIdRaw(projectId);
    this.assertProjectIsActive(project);

    const entity = await this.projectActivityRepo.findOne({
      where: { id: projectActivityId, project: { id: projectId } },
    });

    if (!entity) {
      throw new NotFoundException('Project activity not found');
    }

    if (!entity.isActive) {
      throw new BadRequestException('Already archived');
    }

    entity.isActive = false;
    return this.projectActivityRepo.save(entity);
  }
}
