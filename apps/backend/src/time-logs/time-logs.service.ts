import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TimeLog } from './entities/time-log.entity';
import {
  TimeLogPayload,
  UpdateTimelogPayload,
} from './dtos/TimelogPayload.dto';
import { User } from 'src/users/entities/user.entity';
import { ProjectsService } from 'src/projects/projects.service';
import { GetTimelogsQuery } from './dtos/GetTimelogsQuery.dto';

@Injectable()
export class TimeLogsService {
  constructor(
    @InjectRepository(TimeLog)
    private readonly repo: Repository<TimeLog>,

    private readonly projectsService: ProjectsService,
  ) {}
  // -----------------------
  // SECURITY
  // -----------------------
  private ensureOwnership(log: TimeLog, userId: string) {
    if (log.userId !== userId) {
      throw new ForbiddenException('You cannot access this resource');
    }
  }

  // -----------------------
  // BUSINESS RULE
  // -----------------------
  private async checkDailyLimit(
    userId: string,
    date: string,
    time: number,
    excludeId?: string,
  ) {
    const qb = this.repo
      .createQueryBuilder('t')
      .select('SUM(t.time)', 'total')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.date = :date', { date });

    if (excludeId) {
      qb.andWhere('t.id != :excludeId', { excludeId });
    }

    const result = await qb.getRawOne<{ total: string | null }>();

    const total = Number(result?.total ?? 0);

    if (total + time > 1440) {
      throw new BadRequestException('Daily limit exceeded (max 24 hours)');
    }
  }

  async list(query: GetTimelogsQuery, user: User) {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId: user.id })
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.created_at', 'DESC');

    if (query.date) {
      qb.andWhere('t.date = :date', { date: query.date });
    } else {
      if (query.dateFrom) {
        qb.andWhere('t.date >= :from', { from: query.dateFrom });
      }
      if (query.dateTo) {
        qb.andWhere('t.date <= :to', { to: query.dateTo });
      }
    }

    const [results, count] = await qb
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  // -----------------------
  // GET ONE
  // -----------------------
  async getById(id: string, user: User) {
    const log = await this.repo.findOneBy({ id });

    if (!log) {
      throw new NotFoundException('TimeLog not found');
    }

    this.ensureOwnership(log, user.id);

    return log;
  }

  // -----------------------
  // CREATE
  // -----------------------
  async create(payload: TimeLogPayload, user: User) {
    await this.projectsService.getProjectActivityForUser(
      payload.projectActivityId,
      user,
    );

    await this.checkDailyLimit(user.id, payload.date, payload.time);

    const entity = this.repo.create({
      ...payload,
      user: { id: user.id },
    });

    return this.repo.save(entity);
  }

  // -----------------------
  // UPDATE
  // -----------------------
  async update(id: string, payload: UpdateTimelogPayload, user: User) {
    const log = await this.getById(id, user);

    if (payload.projectActivityId) {
      await this.projectsService.getProjectActivityForUser(
        payload.projectActivityId,
        user,
      );
    }

    const updated = Object.assign(log, payload);

    await this.checkDailyLimit(user.id, updated.date, updated.time, id);

    return this.repo.save(updated);
  }

  // -----------------------
  // DELETE
  // -----------------------
  async delete(id: string, user: User) {
    const log = await this.getById(id, user);

    await this.repo.remove(log);

    return { success: true };
  }
}
