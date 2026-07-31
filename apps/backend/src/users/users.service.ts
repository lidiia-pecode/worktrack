import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { CreateUserPayload, UpdateUserPayload } from './dtos/UserPayload.dto';
import { UpdateProfilePayload } from './dtos/UpdateProfilePayload.dto';
import { hashPassword } from 'src/lib/utils/hash-password.util';
import { UserRole } from './enums/UserRole.enum';
import { User } from './entities/user.entity';
import { Status } from 'src/enums/Status.enum';
import { UsersQuery } from './dtos/UsersQuery.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  hasManagerAccess(user: User): boolean {
    return user.role === UserRole.MANAGER || user.role === UserRole.SUPER_ADMIN;
  }

  canBeProjectMember(user: User) {
    return (
      user.status === Status.ACTIVE &&
      [UserRole.MEMBER, UserRole.MANAGER].includes(user.role)
    );
  }

  private async validateUser(
    payload: { username?: string; email?: string },
    id?: string,
  ): Promise<void> {
    if (payload.username) {
      const duplicateName = await this.repo.exists({
        where: { username: payload.username, ...(id ? { id: Not(id) } : {}) },
      });
      if (duplicateName) {
        throw new ConflictException(
          `User with username ${payload.username} already exists`,
        );
      }
    }
    if (payload.email) {
      const duplicateEmail = await this.repo.exists({
        where: {
          email: payload.email,
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

  async list(query: UsersQuery) {
    const where = query.status ? { status: query.status } : {};

    const [results, count] = await this.repo.findAndCount({
      where,
      skip: query.offset,
      take: query.limit,
    });

    return { results, count };
  }

  async findUserById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.findUserById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  // used in project service
  async findUsersByIds(ids: string[]): Promise<User[]> {
    const users = await this.repo.find({
      where: {
        id: In(ids),
        status: Status.ACTIVE,
      },
    });

    if (users.length !== ids.length) {
      throw new NotFoundException('One or more users not found');
    }
    return users;
  }

  async createUser(payload: CreateUserPayload): Promise<User> {
    await this.validateUser(payload);
    const password = await hashPassword(payload.password);
    const newUser = this.repo.create({
      ...payload,
      password,
    });
    return this.repo.save(newUser);
  }

  // Admin update: role and position ONLY
  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    const user = await this.getUserById(id);

    if (payload.role !== undefined) {
      user.role = payload.role;
    }
    if (payload.position !== undefined) {
      user.position = payload.position;
    }

    return this.repo.save(user);
  }

  // Self update: avatar and password ONLY
  async updateProfile(
    id: string,
    payload: UpdateProfilePayload,
  ): Promise<User> {
    await this.validateUser(payload, id);

    const user = await this.getUserById(id);

    if (payload.avatarUrl !== undefined) {
      user.avatarUrl = payload.avatarUrl;
    }

    if (payload.username !== undefined) {
      user.username = payload.username;
    }

    if (payload.password) {
      user.password = await hashPassword(payload.password);
    }

    return this.repo.save(user);
  }

  async archive(id: string) {
    const user = await this.getUserById(id);
    if (user.status !== Status.ACTIVE) {
      throw new BadRequestException('User is already archived');
    }
    user.status = Status.ARCHIVED;
    return this.repo.save(user);
  }

  async unarchive(id: string) {
    const user = await this.getUserById(id);
    if (user.status === Status.ACTIVE) {
      throw new BadRequestException('User is already active');
    }
    user.status = Status.ACTIVE;
    return this.repo.save(user);
  }
}
