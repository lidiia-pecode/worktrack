import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityPayload } from './dtos/ActivityPayload.dto';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { ActCategoriesService } from 'src/activity-categories/activity-categories.service';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly repo: Repository<Activity>,
    private readonly usersService: UsersService,
    private readonly actCategoriesService: ActCategoriesService,
  ) {}

  private assertManager(user: User) {
    if (!this.usersService.hasManagerAccess(user)) {
      throw new ForbiddenException('Only managers can manage activities');
    }
  }

  private async assertUniqueName(name: string, excludeId?: string) {
    const exists = await this.repo.exists({
      where: {
        name,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (exists) {
      throw new BadRequestException(`Activity "${name}" already exists`);
    }
  }

  async findRaw(id: string) {
    return this.repo.findOneOrFail({
      where: { id },
      relations: ['category'],
    });
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

    await this.repo.remove(activity);
  }
}
