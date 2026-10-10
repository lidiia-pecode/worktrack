import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { sameName } from 'src/lib/utils/same-name.util';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { ActCategory } from './entities/activities-category.entity';
import { ActivityCategoryPayload } from './dtos/activities-category-payload.dto';
import { ActivityCategoriesQuery } from './dtos/activities-categories-query.dto';
import { ActCategoryStatus } from './enums/category-status.enum';
import { ArchivedActivitiesAction } from './enums/archived-activities-action.enum';
import { RestoreCategoryPayload } from './dtos/restore-category-payload.dto';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { andWhereAnyContains } from 'src/lib/utils/contains-text.util';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import {
  findActivitiesInUse,
  findOfferingProjects,
  OfferingProject,
} from 'src/activities/offering-projects';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { ArchiveCategoryPayload } from './dtos/archive-category-payload.dto';
import { ActiveActivitiesAction } from './enums/active-activities-action.enum';

type CategoryImpactActivity = {
  id: string;
  name: string;
  projects: OfferingProject[];
  /** On a project, archived ones too, so it cannot be left without a category. */
  isInUse: boolean;
};

@Injectable()
export class ActCategoriesService {
  constructor(
    @InjectRepository(ActCategory)
    private readonly repo: Repository<ActCategory>,
    private readonly dataSource: DataSource,
  ) {}

  private async assertUniqueName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.repo.exists({
      where: {
        companyId,
        name: sameName(name),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (exists) {
      throw new ConflictException(
        `Category "${name}" already exists in this company`,
      );
    }
  }

  async findRaw(id: string, companyId: string): Promise<ActCategory> {
    const category = await this.repo.findOne({
      where: { id, companyId },
    });

    if (!category) {
      throw new NotFoundException('Activity category not found');
    }

    return category;
  }

  async findLocked(
    id: string,
    companyId: string,
    manager: EntityManager,
  ): Promise<ActCategory> {
    const category = await manager.findOne(ActCategory, {
      where: { id, companyId },
      lock: { mode: 'pessimistic_read' },
    });

    if (!category) {
      throw new NotFoundException('Activity category not found');
    }

    return category;
  }

  async findActiveOnly(
    id: string,
    companyId: string,
    manager: EntityManager,
  ): Promise<ActCategory> {
    const category = await this.findLocked(id, companyId, manager);

    if (category.status === ActCategoryStatus.ARCHIVED) {
      throw new BadRequestException(
        `Category "${category.name}" is archived and cannot be assigned`,
      );
    }

    return category;
  }

  /**
   * With all of its activities, archived ones included, each saying whether a
   * project links it and so whether it may be left without a category.
   */
  async getDetails(
    id: string,
    companyId: string,
  ): Promise<
    Omit<ActCategory, 'activities'> & {
      activities: Array<Activity & { isInUse: boolean }>;
    }
  > {
    const category = await this.repo.findOne({
      where: { id, companyId },
      relations: { activities: true },
      order: { activities: { name: 'ASC' } },
    });

    if (!category) {
      throw new NotFoundException('Activity category not found');
    }

    const inUse = await findActivitiesInUse(
      this.dataSource.getRepository(ProjectActivity),
      category.activities.map((activity) => activity.id),
    );

    return {
      ...category,
      activities: category.activities.map((activity) => ({
        ...activity,
        isInUse: inUse.has(activity.id),
      })),
    };
  }

  async list(user: AuthUser, query: ActivityCategoriesQuery) {
    const qb = this.repo
      .createQueryBuilder('category')
      .loadRelationCountAndMap(
        'category.activitiesCount',
        'category.activities',
        'activity',
        (activities) =>
          activities.andWhere('activity.status = :activeActivity', {
            activeActivity: ActivityStatus.ACTIVE,
          }),
      )
      .where('category.companyId = :companyId', {
        companyId: user.companyId,
      });

    if (query.status) {
      qb.andWhere('category.status = :status', { status: query.status });
    }

    if (query.search) {
      andWhereAnyContains(qb, ['category.name'], query.search);
    }

    const [results, count] = await qb
      .orderBy('category.name', 'ASC')
      .addOrderBy('category.id', 'ASC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  async create(
    payload: ActivityCategoryPayload,
    companyId: string,
  ): Promise<ActCategory> {
    await this.assertUniqueName(companyId, payload.name);

    const category = this.repo.create({
      companyId,
      name: payload.name,
      status: ActCategoryStatus.ACTIVE,
    });

    try {
      return await this.repo.save(category);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          `Category "${payload.name}" already exists in this company`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    payload: ActivityCategoryPayload,
    companyId: string,
  ): Promise<ActCategory> {
    const category = await this.findRaw(id, companyId);

    if (category.status === ActCategoryStatus.ARCHIVED) {
      throw new BadRequestException('An archived category cannot be changed');
    }

    if (payload.name !== category.name) {
      await this.assertUniqueName(companyId, payload.name, id);
      category.name = payload.name;
    }

    try {
      return await this.repo.save(category);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          `Category "${payload.name}" already exists in this company`,
        );
      }
      throw error;
    }
  }

  async getArchiveImpact(
    id: string,
    companyId: string,
  ): Promise<{ activities: CategoryImpactActivity[] }> {
    const category = await this.findRaw(id, companyId);

    if (category.status === ActCategoryStatus.ARCHIVED) {
      throw new BadRequestException('Category is already archived');
    }

    const activities = await this.dataSource.getRepository(Activity).find({
      where: { companyId, categoryId: id, status: ActivityStatus.ACTIVE },
      order: { name: 'ASC' },
    });

    const activityIds = activities.map((activity) => activity.id);
    const projectActivityRepo = this.dataSource.getRepository(ProjectActivity);
    const projectsByActivity = await findOfferingProjects(
      projectActivityRepo,
      companyId,
      activityIds,
    );
    const inUse = await findActivitiesInUse(projectActivityRepo, activityIds);

    return {
      activities: activities.map((activity) => ({
        id: activity.id,
        name: activity.name,
        projects: projectsByActivity.get(activity.id) ?? [],
        isInUse: inUse.has(activity.id),
      })),
    };
  }

  /**
   * An active activity is never in an archived category: archiving moves its
   * active activities, archives them, or leaves them as drafts when no
   * project links them.
   */
  async archive(
    id: string,
    companyId: string,
    payload: ArchiveCategoryPayload = {},
  ): Promise<ActCategory> {
    return this.dataSource.transaction(async (manager) => {
      const category = await manager.findOne(ActCategory, {
        where: { id, companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!category) {
        throw new NotFoundException('Activity category not found');
      }

      if (category.status === ActCategoryStatus.ARCHIVED) {
        throw new BadRequestException('Category is already archived');
      }

      // Locked, so none is put on a project while it may be left a draft.
      const activeActivities = await manager.find(Activity, {
        where: { companyId, categoryId: id, status: ActivityStatus.ACTIVE },
        order: { name: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });

      if (activeActivities.length) {
        await this.moveOrArchiveActivities(
          category,
          activeActivities,
          payload,
          manager,
        );
      }

      category.status = ActCategoryStatus.ARCHIVED;
      return manager.save(category);
    });
  }

  private async moveOrArchiveActivities(
    category: ActCategory,
    activities: Activity[],
    payload: ArchiveCategoryPayload,
    manager: EntityManager,
  ): Promise<void> {
    const activityIds = In(activities.map((activity) => activity.id));

    if (payload.activities === ActiveActivitiesAction.MOVE) {
      const { moveToCategoryId } = payload;

      if (!moveToCategoryId || moveToCategoryId === category.id) {
        throw new BadRequestException(
          'Choose another category to move the activities to',
        );
      }

      const target = await this.findActiveOnly(
        moveToCategoryId,
        category.companyId,
        manager,
      );
      await manager.update(
        Activity,
        { id: activityIds },
        { categoryId: target.id },
      );
      return;
    }

    if (payload.activities === ActiveActivitiesAction.ARCHIVE) {
      await manager.update(
        Activity,
        { id: activityIds },
        { status: ActivityStatus.ARCHIVED },
      );
      return;
    }

    if (payload.activities === ActiveActivitiesAction.UNCATEGORIZE) {
      const inUse = await findActivitiesInUse(
        manager.getRepository(ProjectActivity),
        activities.map((activity) => activity.id),
      );
      const linked = activities.filter((activity) => inUse.has(activity.id));

      if (linked.length) {
        const names = linked.map((activity) => activity.name).join(', ');
        throw new ConflictException(
          `These activities are on projects, so they need a category: ${names}. Move them to another category or archive them instead.`,
        );
      }

      await manager.update(Activity, { id: activityIds }, { categoryId: null });
      return;
    }

    const names = activities.map((activity) => activity.name).join(', ');
    throw new ConflictException(
      `Category "${category.name}" still has active activities: ${names}. Move them to another category or archive them first.`,
    );
  }

  /**
   * Nothing records which activities were archived with the category, so
   * restoring them brings back all of its archived activities.
   */
  async unarchive(
    id: string,
    companyId: string,
    payload: RestoreCategoryPayload = {},
  ): Promise<ActCategory> {
    return this.dataSource.transaction(async (manager) => {
      const category = await manager.findOne(ActCategory, {
        where: { id, companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!category) {
        throw new NotFoundException('Activity category not found');
      }

      if (category.status === ActCategoryStatus.ACTIVE) {
        throw new BadRequestException('Category is already active');
      }

      category.status = ActCategoryStatus.ACTIVE;
      const restored = await manager.save(category);

      if (payload.activities === ArchivedActivitiesAction.RESTORE) {
        await manager.update(
          Activity,
          { companyId, categoryId: id, status: ActivityStatus.ARCHIVED },
          { status: ActivityStatus.ACTIVE },
        );
      }

      return restored;
    });
  }
}
