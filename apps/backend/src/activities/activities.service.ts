import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Not, Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityPayload } from './dtos/ActivityPayload.dto';
import { ActCategoriesService } from 'src/activity-categories/activity-categories.service';
import { Status } from 'src/enums/Status.enum';
import { ActivitiesQuery } from './dtos/ActivitiesQuery.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly repo: Repository<Activity>,
    private readonly actCategoriesService: ActCategoriesService,
  ) {}

  private async assertUniqueName(name: string, excludeId?: string) {
    const exists = await this.repo.exists({
      where: {
        name: ILike(name.trim()),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (exists) {
      throw new BadRequestException(`Activity "${name}" already exists`);
    }
  }

  async findRaw(id: string) {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!entity) {
      throw new NotFoundException('Activity does not exist');
    }

    return entity;
  }

  async findActiveOrRestoreMany(ids: string[]) {
    const uniqueIds = [...new Set(ids)];

    const activities = await this.repo.find({
      where: {
        id: In(uniqueIds),
      },
    });

    const foundIds = new Set(activities.map((activity) => activity.id));

    const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

    if (missingIds.length) {
      throw new NotFoundException(
        `Activities not found: ${missingIds.join(', ')}`,
      );
    }

    const archivedActivities = activities.filter(
      (activity) => activity.status === Status.ARCHIVED,
    );

    if (archivedActivities.length) {
      archivedActivities.forEach((activity) => {
        activity.status = Status.ACTIVE;
      });

      await this.repo.save(archivedActivities);
    }

    return activities;
  }

  async list(query: ActivitiesQuery) {
    const where = query.status ? { status: query.status } : {};

    const [results, count] = await this.repo.findAndCount({
      where,
      relations: ['category'],
      skip: query.offset,
      take: query.limit,
      order: {
        name: 'ASC',
      },
    });

    return { results, count };
  }

  async getById(id: string) {
    return this.findRaw(id);
  }

  async create(payload: ActivityPayload) {
    await this.assertUniqueName(payload.name);

    const category = await this.actCategoriesService.findActiveOrRestore(
      payload.categoryId,
    );

    const activity = this.repo.create({
      name: payload.name,
      category,
    });

    return this.repo.save(activity);
  }

  async update(id: string, payload: ActivityPayload) {
    const activity = await this.findRaw(id);

    await this.assertUniqueName(payload.name, id);

    const category = await this.actCategoriesService.findActiveOrRestore(
      payload.categoryId,
    );

    activity.name = payload.name;
    activity.category = category;

    return this.repo.save(activity);
  }

  async archive(id: string) {
    const activity = await this.findRaw(id);

    if (activity.status === Status.ARCHIVED) {
      throw new BadRequestException('Activity is already archived');
    }

    activity.status = Status.ARCHIVED;
    return this.repo.save(activity);
  }

  // -------------------------
  // RESTORE (soft delete)
  // -------------------------

  async unarchive(id: string) {
    const activity = await this.findRaw(id);

    if (activity.status === Status.ACTIVE) {
      throw new BadRequestException('Activity is already active');
    }
    activity.status = Status.ACTIVE;

    return this.repo.save(activity);
  }
}
