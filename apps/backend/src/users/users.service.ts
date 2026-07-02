import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';

import { CreateUserPayload, UpdateUserPayload } from './dtos/UserPayload.dto';
import { CreateAdminPayloadDto } from './dtos/CreateAdminPayload.dto';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { hashPassword } from 'src/lib/utils/hash-password.util';
import { UserRole } from './enums/UserRole.enum';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  hasManagerAccess(user: User): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  }

  private async validateUser(
    payload: CreateUserPayload | UpdateUserPayload,
    id?: string,
  ) {
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

    if ('email' in payload && payload.email) {
      const duplicateEmail = await this.repo.findOne({
        where: { email: payload.email, ...(id ? { id: Not(id) } : {}) },
      });

      if (duplicateEmail) {
        throw new ConflictException(
          `User with email ${payload.email} already exists`,
        );
      }
    }
  }

  async list(pagination: PaginationQuery) {
    const [results, count] = await this.repo.findAndCount({
      skip: pagination.offset,
      take: pagination.limit,
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

  async findUsersByIds(ids: string[]): Promise<User[]> {
    return this.repo.findBy({ id: In(ids) });
  }

  async createUser(payload: CreateUserPayload): Promise<User> {
    await this.validateUser(payload);
    const password = await hashPassword(payload.password);

    const newUser = this.repo.create({ ...payload, password });

    return this.repo.save(newUser);
  }

  async createAdmin(dto: CreateAdminPayloadDto): Promise<User> {
    if (dto.role !== UserRole.ADMIN) {
      throw new BadRequestException(
        'This endpoint is only for creating ADMIN users.',
      );
    }

    const existingUser = await this.repo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists.');
    }

    const newUser = this.repo.create(dto);
    if (newUser.password) {
      newUser.password = await hashPassword(newUser.password);
    }

    return this.repo.save(newUser);
  }
  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    await this.validateUser(payload, id);

    const user = await this.getUserById(id);

    const updatedPayload = { ...payload };

    if (updatedPayload.password) {
      updatedPayload.password = await hashPassword(updatedPayload.password);
    }

    return this.repo.save({ ...user, ...updatedPayload });
  }

  async deleteUser(id: string): Promise<void> {
    const result = await this.repo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Unable deleting user with id ${id}`);
    }
  }
}
