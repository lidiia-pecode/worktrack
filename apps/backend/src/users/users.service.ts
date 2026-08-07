import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { CreateUserPayload, UpdateUserPayload } from './dtos/UserPayload.dto';
import { UpdateProfilePayload } from './dtos/UpdateProfilePayload.dto';
import { User } from './entities/user.entity';
import { UsersQuery } from './dtos/UsersQuery.dto';
import { hashPassword } from 'src/lib/utils/hash-password.util';
import { UserRole, UserStatus } from './enums/UserRole.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  private async validateUser(
    payload: { username?: string; email?: string },
    id?: string,
    repo: Repository<User> = this.repo,
  ): Promise<void> {
    if (payload.username) {
      const duplicateName = await repo.exists({
        where: {
          username: payload.username,
          ...(id ? { id: Not(id) } : {}),
        },
      });

      if (duplicateName) {
        throw new ConflictException(
          `User with username ${payload.username} already exists`,
        );
      }
    }

    if (payload.email) {
      const duplicateEmail = await repo.exists({
        where: {
          email: payload.email.toLowerCase().trim(),
          ...(id ? { id: Not(id) } : {}),
        },
      });

      if (duplicateEmail) {
        throw new ConflictException(
          `User with email ${payload.email} already exists`,
        );
      }
    }
  }

  // Auth methods
  async findByEmailWithCompany(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['company'],
    });
  }

  async findByGoogleIdWithCompany(googleId: string): Promise<User | null> {
    return this.repo.findOne({
      where: { googleId },
      relations: ['company'],
    });
  }

  async findUserByIdWithCompany(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['company'],
    });
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<void> {
    const existingUser = await this.repo.findOne({ where: { googleId } });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException(
        'This Google account is already linked to another user',
      );
    }

    await this.repo.update(userId, { googleId });
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  // Multi-Tenant Business API

  async list(companyId: string, query: UsersQuery) {
    const where = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [results, count] = await this.repo.findAndCount({
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
    repo: Repository<User> = this.repo,
  ): Promise<User | null> {
    return repo.findOne({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
    });
  }

  async getUserById(
    id: string,
    companyId: string,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    const user = await this.findUserById(id, companyId, repo);

    if (!user) {
      throw new NotFoundException(
        `User with id ${id} not found in this company`,
      );
    }

    return user;
  }

  async findUsersByIds(
    ids: string[],
    companyId: string,
    repo: Repository<User> = this.repo,
  ): Promise<User[]> {
    const uniqueIds = Array.from(new Set(ids));
    if (!uniqueIds.length) return [];

    const users = await repo.find({
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
    repo: Repository<User> = this.repo,
  ): Promise<User[]> {
    return this.findUsersByIds(ids, companyId, repo);
  }

  async createUser(
    companyId: string,
    payload: CreateUserPayload,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    await this.validateUser(payload, undefined, repo);

    const passwordHash = await hashPassword(payload.password);

    const newUser = repo.create({
      ...payload,
      companyId,
      passwordHash,
      status: UserStatus.ACTIVE,
    });

    return repo.save(newUser);
  }

  async updateUser(
    id: string,
    companyId: string,
    payload: UpdateUserPayload,
    currentRole: UserRole,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    const user = await this.getUserById(id, companyId, repo);

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

    return repo.save(user);
  }

  async updateProfile(
    id: string,
    companyId: string,
    payload: UpdateProfilePayload,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    await this.validateUser(payload, id, repo);

    const user = await this.getUserById(id, companyId, repo);

    if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl;
    if (payload.username !== undefined) user.username = payload.username;
    if (payload.password) {
      user.passwordHash = await hashPassword(payload.password);
    }

    return repo.save(user);
  }

  async archive(
    id: string,
    currentUserId: string,
    companyId: string,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot archive your own account');
    }

    const user = await this.getUserById(id, companyId, repo);

    if (user.role === UserRole.OWNER) {
      throw new ForbiddenException('Company OWNER account cannot be archived');
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new BadRequestException('User is already archived');
    }

    user.status = UserStatus.DEACTIVATED;
    return repo.save(user);
  }

  async unarchive(
    id: string,
    companyId: string,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    const user = await this.getUserById(id, companyId, repo);

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already active');
    }

    user.status = UserStatus.ACTIVE;
    return repo.save(user);
  }
}
