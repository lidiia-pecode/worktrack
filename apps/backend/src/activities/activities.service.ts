import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Not, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Activity } from './entities/activity.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { ActivityPayload } from './dtos/ActivityPayload.dto';
import { UsersService } from 'src/users/users.service';

import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { ActCategoriesService } from 'src/activity-categories/activity-categories.service';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly repo: Repository<Activity>,
    private readonly usersService: UsersService,
    private readonly actCategoriesService: ActCategoriesService,

    @InjectRepository(ProjectActivity)
    private readonly projectActivityRepo: Repository<ProjectActivity>,
  ) {}

  private assertManager(user: User) {
    if (!this.usersService.hasManagerAccess(user)) {
      throw new ForbiddenException('Only managers can manage activities');
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

  async findByIds(ids: string[]) {
    const uniqueIds = [...new Set(ids)];

    const activities = await this.repo.find({
      where: {
        id: In(uniqueIds),
      },
      relations: ['category'],
    });

    const foundIds = new Set(activities.map((activity) => activity.id));

    const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

    if (missingIds.length) {
      throw new NotFoundException(
        `Activities not found: ${missingIds.join(', ')}`,
      );
    }

    return activities;
  }

  async list(user: User, pagination: PaginationQuery) {
    this.assertManager(user);

    const [results, count] = await this.repo.findAndCount({
      relations: ['category'],
      skip: pagination.offset,
      take: pagination.limit,
      order: {
        name: 'ASC',
      },
    });

    return { results, count };
  }

  async getById(id: string, user: User) {
    this.assertManager(user);

    return this.findRaw(id);
  }

  async create(payload: ActivityPayload, user: User) {
    this.assertManager(user);

    await this.assertUniqueName(payload.name);

    const category = await this.actCategoriesService.findRaw(
      payload.categoryId,
    );

    const activity = this.repo.create({
      name: payload.name,
      category,
    });

    return this.repo.save(activity);
  }

  async update(id: string, payload: ActivityPayload, user: User) {
    this.assertManager(user);

    const activity = await this.findRaw(id);

    await this.assertUniqueName(payload.name, id);

    const category = await this.actCategoriesService.findRaw(
      payload.categoryId,
    );

    activity.name = payload.name;
    activity.category = category;

    return this.repo.save(activity);
  }

  async delete(id: string, user: User) {
    this.assertManager(user);

    const activity = await this.findRaw(id);

    const inUse = await this.projectActivityRepo.exists({
      where: {
        activity: {
          id,
        },
      },
    });

    if (inUse) {
      throw new BadRequestException('Activity is used by one or more projects');
    }

    await this.repo.remove(activity);
  }
}
