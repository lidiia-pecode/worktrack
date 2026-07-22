import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { ActCategory } from './entities/activities-category.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { ActivityCategoryPayload } from './dtos/ActivitiesCategoryPayload.dto';
import { Status } from 'src/enums/Status.enum';

@Injectable()
export class ActCategoriesService {
  constructor(
    @InjectRepository(ActCategory)
    private readonly repo: Repository<ActCategory>,
    private readonly usersService: UsersService,

    @InjectRepository(Activity)
    private readonly ActivitiesRepo: Repository<Activity>,
  ) {}

  private assertManager(user: User) {
    if (!this.usersService.hasManagerAccess(user)) {
      throw new ForbiddenException(
        'Only managers can manage activity categories',
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
      throw new BadRequestException(`Category "${name}" already exists`);
    }
  }

  async findRaw(id: string) {
    const category = await this.repo.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Activity category not found');
    }

    return category;
  }

  async getById(id: string, user: User) {
    this.assertManager(user);

    return this.findRaw(id);
  }

  async list(user: User, pagination: PaginationQuery) {
    this.assertManager(user);

    const [results, count] = await this.repo.findAndCount({
      skip: pagination.offset,
      take: pagination.limit,
      order: {
        name: 'ASC',
      },
    });

    return { results, count };
  }

  async create(payload: ActivityCategoryPayload, user: User) {
    this.assertManager(user);

    await this.assertUniqueName(payload.name);

    const category = this.repo.create({ status: Status.ACTIVE, ...payload });
    return this.repo.save(category);
  }

  async update(id: string, payload: ActivityCategoryPayload, user: User) {
    this.assertManager(user);

    const category = await this.findRaw(id);

    await this.assertUniqueName(payload.name, id);

    category.name = payload.name;

    return this.repo.save(category);
  }

  // async delete(id: string, user: User) {
  //   this.assertManager(user);

  //   const category = await this.findRaw(id);

  //   const inUse = await this.ActivitiesRepo.exists({
  //     where: {
  //       category: {
  //         id,
  //       },
  //     },
  //   });

  //   if (inUse) {
  //     throw new BadRequestException('Category is used by activities');
  //   }

  //   await this.repo.remove(category);
  // }

  // -------------------------
  // Archive (soft delete)
  // -------------------------

  async archive(id: string, user: User) {
    this.assertManager(user);

    const category = await this.findRaw(id);

    category.status = Status.ARCHIVED;

    return this.repo.save(category);
  }

  // -------------------------
  // RESTORE (soft delete)
  // -------------------------

  async unarchive(id: string, user: User) {
    this.assertManager(user);

    const category = await this.findRaw(id);

    category.status = Status.ACTIVE;

    return this.repo.save(category);
  }
}
