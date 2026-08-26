import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import {
  ActivityPayload,
  UpdateActivityPayload,
} from './dtos/ActivityPayload.dto';
import { ActCategoriesService } from 'src/activity-categories/activity-categories.service';
import { ActivitiesQuery } from './dtos/ActivitiesQuery.dto';
import { ActivityStatus } from './enums/activity-status.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly repo: Repository<Activity>,
    private readonly actCategoriesService: ActCategoriesService,
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
        name: ILike(name.trim()),
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
    };

    const [results, count] = await this.repo.findAndCount({
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

    const category = await this.actCategoriesService.findActiveOnly(
      payload.categoryId,
      companyId,
    );

    const activity = this.repo.create({
      companyId,
      name: payload.name,
      category,
      isAbsence: payload.isAbsence ?? false,
      defaultBillable: payload.defaultBillable ?? true,
      status: ActivityStatus.ACTIVE,
    });

    try {
      return await this.repo.save(activity);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          `Activity "${payload.name}" already exists in this company`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    payload: UpdateActivityPayload,
    companyId: string,
  ): Promise<Activity> {
    const activity = await this.findRaw(id, companyId);

    if (payload.name !== undefined && payload.name !== activity.name) {
      await this.assertUniqueName(companyId, payload.name, id);
      activity.name = payload.name;
    }

    if (payload.categoryId !== undefined) {
      activity.category = await this.actCategoriesService.findActiveOnly(
        payload.categoryId,
        companyId,
      );
    }

    if (payload.isAbsence !== undefined) {
      activity.isAbsence = payload.isAbsence;
    }

    if (payload.defaultBillable !== undefined) {
      activity.defaultBillable = payload.defaultBillable;
    }

    try {
      return await this.repo.save(activity);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          `Activity "${payload.name}" already exists in this company`,
        );
      }
      throw error;
    }
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
    repo: Repository<Activity> = this.repo,
  ): Promise<Activity> {
    const activity = await this.findRaw(id, companyId, repo);

    if (activity.status === ActivityStatus.ACTIVE) {
      throw new BadRequestException('Activity is already active');
    }

    activity.status = ActivityStatus.ACTIVE;
    return repo.save(activity);
  }
}
