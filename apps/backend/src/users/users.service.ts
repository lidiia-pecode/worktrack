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

  async findUserById(
    id: string,
    repo: Repository<User> = this.repo,
  ): Promise<User | null> {
    return repo.findOneBy({ id });
  }

  async getUserById(
    id: string,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    const user = await this.findUserById(id, repo);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  // used in project service
  async findUsersByIds(
    ids: string[],
    repo: Repository<User> = this.repo,
  ): Promise<User[]> {
    const users = await repo.find({
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

  async createUser(
    payload: CreateUserPayload,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    await this.validateUser(payload, undefined, repo);

    const password = await hashPassword(payload.password);

    const newUser = repo.create({
      ...payload,
      password,
    });

    return repo.save(newUser);
  }

  // Admin update: role and position ONLY
  async updateUser(
    id: string,
    payload: UpdateUserPayload,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    const user = await this.getUserById(id, repo);

    if (payload.role !== undefined) {
      user.role = payload.role;
    }

    if (payload.position !== undefined) {
      user.position = payload.position;
    }

    return repo.save(user);
  }

  // Self update: avatar and password ONLY
  async updateProfile(
    id: string,
    payload: UpdateProfilePayload,
    repo: Repository<User> = this.repo,
  ): Promise<User> {
    await this.validateUser(payload, id, repo);

    const user = await this.getUserById(id, repo);

    if (payload.avatarUrl !== undefined) {
      user.avatarUrl = payload.avatarUrl;
    }

    if (payload.username !== undefined) {
      user.username = payload.username;
    }

    if (payload.password) {
      user.password = await hashPassword(payload.password);
    }

    return repo.save(user);
  }

  async archive(id: string, repo: Repository<User> = this.repo) {
    const user = await this.getUserById(id, repo);

    if (user.status !== Status.ACTIVE) {
      throw new BadRequestException('User is already archived');
    }

    user.status = Status.ARCHIVED;

    return repo.save(user);
  }

  async unarchive(id: string, repo: Repository<User> = this.repo) {
    const user = await this.getUserById(id, repo);

    if (user.status === Status.ACTIVE) {
      throw new BadRequestException('User is already active');
    }

    user.status = Status.ACTIVE;

    return repo.save(user);
  }
}
