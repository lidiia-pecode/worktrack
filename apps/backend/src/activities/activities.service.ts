import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { sameName } from 'src/lib/utils/same-name.util';
import { Activity } from './entities/activity.entity';
import {
  ActivityPayload,
  RestoreActivityPayload,
  UpdateActivityPayload,
} from './dtos/activity-payload.dto';
import { ActCategoriesService } from 'src/activity-categories/activity-categories.service';
import { ActivitiesQuery } from './dtos/activities-query.dto';
import { ActivityStatus } from './enums/activity-status.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { containsText } from 'src/lib/utils/contains-text.util';
import { UserRole } from 'src/users/enums/user-role.enum';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { findOfferingProjects, OfferingProject } from './offering-projects';
import { ActCategoryStatus } from 'src/activity-categories/enums/category-status.enum';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly repo: Repository<Activity>,
    private readonly actCategoriesService: ActCategoriesService,
    @InjectRepository(ProjectActivity)
    private readonly projectActivityRepo: Repository<ProjectActivity>,
    private readonly dataSource: DataSource,
  ) {}

  private async assertUniqueName(
    companyId: string,
    name: string,
    excludeId?: string,
    repo: Repository<Activity> = this.repo,
  ): Promise<void> {
    const exists = await repo.exists({
      where: {
        companyId,
        name: sameName(name),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (exists) {
      throw new ConflictException(
        `Activity "${name}" already exists in this company`,
      );
    }
  }

  async findRaw(
    id: string,
    companyId: string,
    repo: Repository<Activity> = this.repo,
  ): Promise<Activity> {
    const entity = await repo.findOne({
      where: { id, companyId },
      relations: {
        category: true,
      },
    });

    if (!entity) {
      throw new NotFoundException('Activity does not exist');
    }

    return entity;
  }

  async findActiveOnlyMany(
    ids: string[],
    companyId: string,
    repo: Repository<Activity> = this.repo,
  ): Promise<Activity[]> {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return [];

    const activities = await repo.find({
      where: {
        id: In(uniqueIds),
        companyId,
      },
    });

    const foundIds = new Set(activities.map((activity) => activity.id));
    const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

    if (missingIds.length) {
      throw new NotFoundException(
        `Activities not found or belong to another company: ${missingIds.join(', ')}`,
      );
    }

    const archivedActivities = activities.filter(
      (activity) => activity.status === ActivityStatus.ARCHIVED,
    );

    if (archivedActivities.length) {
      const archivedNames = archivedActivities.map((a) => a.name).join(', ');
      throw new BadRequestException(
        `Cannot assign archived activities: ${archivedNames}. Please unarchive them first.`,
      );
    }

    return activities;
  }

  async list(user: AuthUser, query: ActivitiesQuery) {
    const where: FindOptionsWhere<Activity> = {
      companyId: user.companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: containsText(query.search) } : {}),
    };

    const [activities, count] = await this.repo.findAndCount({
      where,
      relations: {
        category: true,
      },
      skip: query.offset,
      take: query.limit,
      order: {
        name: 'ASC',
      },
    });

    // An employee sees only their own projects, so they get no project count.
    if (user.role === UserRole.EMPLOYEE) {
      return { results: activities, count };
    }

    const offeringProjects = await findOfferingProjects(
      this.projectActivityRepo,
      user.companyId,
      activities.map((activity) => activity.id),
    );
    const results = activities.map((activity) => ({
      ...activity,
      projectsCount: offeringProjects.get(activity.id)?.length ?? 0,
    }));

    return { results, count };
  }

  async getById(
    id: string,
    companyId: string,
    repo: Repository<Activity> = this.repo,
  ): Promise<Activity> {
    return this.findRaw(id, companyId, repo);
  }

  async create(payload: ActivityPayload, companyId: string): Promise<Activity> {
    await this.assertUniqueName(companyId, payload.name);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Activity);
      const category = await this.actCategoriesService.findActiveOnly(
        payload.categoryId,
        companyId,
        manager,
      );

      const activity = repo.create({
        companyId,
        name: payload.name,
        category,
        defaultBillable: payload.defaultBillable ?? true,
        status: ActivityStatus.ACTIVE,
      });

      try {
        return await repo.save(activity);
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            `Activity "${payload.name}" already exists in this company`,
          );
        }
        throw error;
      }
    });
  }

  async update(
    id: string,
    payload: UpdateActivityPayload,
    companyId: string,
  ): Promise<Activity> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Activity);
      const activity = await this.findRaw(id, companyId, repo);

      if (payload.name !== undefined && payload.name !== activity.name) {
        await this.assertUniqueName(companyId, payload.name, id, repo);
        activity.name = payload.name;
      }

      if (payload.categoryId !== undefined) {
        activity.category = await this.actCategoriesService.findActiveOnly(
          payload.categoryId,
          companyId,
          manager,
        );
      }

      if (payload.defaultBillable !== undefined) {
        activity.defaultBillable = payload.defaultBillable;
      }

      try {
        return await repo.save(activity);
      } catch (error: unknown) {
        if (isDatabaseConflictError(error)) {
          throw new ConflictException(
            `Activity "${payload.name}" already exists in this company`,
          );
        }
        throw error;
      }
    });
  }

  async getArchiveImpact(
    id: string,
    companyId: string,
  ): Promise<{ projects: OfferingProject[] }> {
    const activity = await this.findRaw(id, companyId);

    if (activity.status === ActivityStatus.ARCHIVED) {
      throw new BadRequestException('Activity is already archived');
    }

    const projectsByActivity = await findOfferingProjects(
      this.projectActivityRepo,
      companyId,
      [id],
    );

    return { projects: projectsByActivity.get(id) ?? [] };
  }

  async archive(
    id: string,
    companyId: string,
    repo: Repository<Activity> = this.repo,
  ): Promise<Activity> {
    const activity = await this.findRaw(id, companyId, repo);

    if (activity.status === ActivityStatus.ARCHIVED) {
      throw new BadRequestException('Activity is already archived');
    }

    activity.status = ActivityStatus.ARCHIVED;
    return repo.save(activity);
  }

  async unarchive(
    id: string,
    companyId: string,
    payload: RestoreActivityPayload = {},
  ): Promise<Activity> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Activity);
      const activity = await this.findRaw(id, companyId, repo);

      if (activity.status === ActivityStatus.ACTIVE) {
        throw new BadRequestException('Activity is already active');
      }

      if (payload.categoryId) {
        const category = await this.actCategoriesService.findActiveOnly(
          payload.categoryId,
          companyId,
          manager,
        );
        activity.category = category;
        activity.categoryId = category.id;
      } else {
        const category = await this.actCategoriesService.findLocked(
          activity.categoryId,
          companyId,
          manager,
        );

        if (category.status === ActCategoryStatus.ARCHIVED) {
          throw new ConflictException(
            `Category "${category.name}" is archived. Restore the category first, or move the activity to an active one.`,
          );
        }
      }

      activity.status = ActivityStatus.ACTIVE;
      return repo.save(activity);
    });
  }
}
