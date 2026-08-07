import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { ActCategory } from './entities/activities-category.entity';
import { ActivityCategoryPayload } from './dtos/ActivitiesCategoryPayload.dto';
import { ActivityCategoriesQuery } from './dtos/ActivitiesCategoriesQuery.dto';
import { ActCategoryStatus } from './enums/category-status';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';

@Injectable()
export class ActCategoriesService {
  constructor(
    @InjectRepository(ActCategory)
    private readonly repo: Repository<ActCategory>,
  ) {}

  private async assertUniqueName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.repo.exists({
      where: {
        companyId,
        name: ILike(name.trim()),
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

  /**
   * Отримує категорію та переконується, що вона активна.
   * Без авто-розархівації заархівованих категорій.
   */
  async findActiveOnly(id: string, companyId: string): Promise<ActCategory> {
    const category = await this.findRaw(id, companyId);

    if (category.status === ActCategoryStatus.ARCHIVED) {
      throw new BadRequestException(
        `Category "${category.name}" is archived and cannot be assigned`,
      );
    }

    return category;
  }

  async getById(id: string, companyId: string): Promise<ActCategory> {
    return this.findRaw(id, companyId);
  }

  async list(user: AuthUser, query: ActivityCategoriesQuery) {
    const where: FindOptionsWhere<ActCategory> = {
      companyId: user.companyId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [results, count] = await this.repo.findAndCount({
      where,
      skip: query.offset,
      take: query.limit,
      order: {
        name: 'ASC',
      },
    });

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

  async archive(id: string, companyId: string): Promise<ActCategory> {
    const category = await this.findRaw(id, companyId);

    if (category.status === ActCategoryStatus.ARCHIVED) {
      throw new BadRequestException('Category is already archived');
    }

    category.status = ActCategoryStatus.ARCHIVED;
    return this.repo.save(category);
  }

  async unarchive(id: string, companyId: string): Promise<ActCategory> {
    const category = await this.findRaw(id, companyId);

    if (category.status === ActCategoryStatus.ACTIVE) {
      throw new BadRequestException('Category is already active');
    }

    category.status = ActCategoryStatus.ACTIVE;
    return this.repo.save(category);
  }
}
