import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { CreateUserPayload, UpdateUserPayload } from './dtos/UserPayload.dto';
import { UpdateProfilePayload } from './dtos/UpdateProfilePayload.dto';
import { User } from './entities/user.entity';
import { UsersQuery } from './dtos/UsersQuery.dto';
import { UserRole, UserStatus } from './enums/UserRole.enum';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';
import { hashPassword } from 'src/lib/utils/hash-password.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  private getRepository(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.repo;
  }

  private async safeSave(
    repo: Repository<User>,
    user: User,
    email?: string,
    username?: string,
  ): Promise<User> {
    try {
      return await repo.save(user);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        const constraint = error.driverError.constraint;

        if (
          constraint?.includes('email') ||
          error.driverError.detail?.includes('email')
        ) {
          throw new ConflictException(
            `User with email ${email || user.email} already exists`,
          );
        }
        if (
          constraint?.includes('username') ||
          error.driverError.detail?.includes('username')
        ) {
          throw new ConflictException(
            `User with username ${username || user.username} already exists`,
          );
        }
        throw new ConflictException(
          'A user with these unique credentials already exists',
        );
      }
      throw error;
    }
  }

  async findByEmailWithCompany(
    email: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['company'],
    });
  }

  async findByGoogleIdWithCompany(
    googleId: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { googleId },
      relations: ['company'],
    });
  }

  async findUserByIdWithCompany(
    id: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { id },
      relations: ['company'],
    });
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepository(manager);
    const existingUser = await repo.findOne({
      where: { googleId },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException(
        'This Google account is already linked to another user',
      );
    }

    try {
      await repo.update({ id: userId }, { googleId });
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          'This Google account is already linked to another user',
        );
      }
      throw error;
    }
  }

  // Multi-Tenant Business API

  async list(companyId: string, query: UsersQuery, manager?: EntityManager) {
    const where = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [results, count] = await this.getRepository(manager).findAndCount({
      where,
      skip: query.offset,
      take: query.limit,
      order: { createdAt: 'DESC' },
    });

    return { results, count };
  }

  async findUserById(
    id: string,
    companyId?: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
    });
  }

  async getUserById(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<User & { hasPassword: boolean; googleLinked: boolean }> {
    const user = await this.findUserById(id, companyId, manager);
    if (!user) {
      throw new NotFoundException(
        `User with id ${id} not found in this company`,
      );
    }
    return {
      ...user,
      hasPassword: Boolean(user.passwordHash),
      googleLinked: Boolean(user.googleId),
    };
  }

  async findUsersByIds(
    ids: string[],
    companyId: string,
    manager?: EntityManager,
  ): Promise<User[]> {
    const uniqueIds = Array.from(new Set(ids));
    if (!uniqueIds.length) return [];

    const users = await this.getRepository(manager).find({
      where: {
        id: In(uniqueIds),
        companyId,
        status: UserStatus.ACTIVE,
      },
    });

    if (users.length !== uniqueIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Users not found, inactive, or belong to another company: ${missingIds.join(', ')}`,
      );
    }

    return users;
  }

  async findActiveOnlyMany(
    ids: string[],
    companyId: string,
    manager?: EntityManager,
  ): Promise<User[]> {
    return this.findUsersByIds(ids, companyId, manager);
  }

  async createUser(
    companyId: string,
    payload: CreateUserPayload,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      const passwordHash = await hashPassword(payload.password);

      const user = repo.create({
        ...payload,
        email: payload.email?.toLowerCase().trim(),
        companyId,
        passwordHash,
        status: UserStatus.ACTIVE,
      });

      return this.safeSave(repo, user, payload.email, payload.username);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  async updateUser(
    id: string,
    companyId: string,
    payload: UpdateUserPayload,
    currentRole: UserRole,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (user.role === UserRole.OWNER && currentRole !== UserRole.OWNER) {
        throw new ForbiddenException(
          'Only Company OWNER can modify another OWNER',
        );
      }

      if (payload.firstName !== undefined) user.firstName = payload.firstName;
      if (payload.lastName !== undefined) user.lastName = payload.lastName;
      if (payload.role !== undefined) {
        if (payload.role === UserRole.OWNER && currentRole !== UserRole.OWNER) {
          throw new ForbiddenException(
            'Only Company OWNER can assign the OWNER role',
          );
        }
        user.role = payload.role;
      }
      if (payload.position !== undefined) user.position = payload.position;
      if (payload.capacityHoursPerWeek !== undefined) {
        user.capacityHoursPerWeek = payload.capacityHoursPerWeek;
      }

      return this.safeSave(repo, user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  async updateProfile(
    id: string,
    companyId: string,
    payload: UpdateProfilePayload,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (payload.firstName !== undefined) user.firstName = payload.firstName;
      if (payload.lastName !== undefined) user.lastName = payload.lastName;
      if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl;
      if (payload.username !== undefined) user.username = payload.username;

      return this.safeSave(repo, user, undefined, payload.username);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  async updatePassword(
    id: string,
    companyId: string,
    passwordHash: string,
    manager?: EntityManager,
  ): Promise<void> {
    const execute = async (man: EntityManager): Promise<void> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);
      user.passwordHash = passwordHash;
      await repo.save(user);
    };

    if (manager) {
      await execute(manager);
    } else {
      await this.dataSource.transaction(execute);
    }
  }

  async archive(
    id: string,
    currentUserId: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      if (id === currentUserId) {
        throw new BadRequestException('You cannot archive your own account');
      }

      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (user.role === UserRole.OWNER) {
        throw new ForbiddenException(
          'Company OWNER account cannot be archived',
        );
      }

      if (user.status === UserStatus.DEACTIVATED) {
        throw new BadRequestException('User is already archived');
      }

      user.status = UserStatus.DEACTIVATED;
      return repo.save(user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }

  async unarchive(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<User> {
    const execute = async (man: EntityManager): Promise<User> => {
      const repo = this.getRepository(man);
      const user = await this.getUserById(id, companyId, man);

      if (user.status === UserStatus.ACTIVE) {
        throw new BadRequestException('User is already active');
      }

      user.status = UserStatus.ACTIVE;
      return repo.save(user);
    };

    return manager ? execute(manager) : this.dataSource.transaction(execute);
  }
}
