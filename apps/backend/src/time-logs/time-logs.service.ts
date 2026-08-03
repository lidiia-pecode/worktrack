import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { TimeLog } from './entities/time-log.entity';
import {
  TimeLogPayload,
  UpdateTimelogPayload,
} from './dtos/TimelogPayload.dto';
import { User } from 'src/users/entities/user.entity';
import { ProjectsService } from 'src/projects/projects.service';
import { GetTimelogsQuery } from './dtos/GetTimelogsQuery.dto';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { AccessControlService } from 'src/auth/services/access-control.service';

@Injectable()
export class TimeLogsService {
  constructor(
    @InjectRepository(TimeLog)
    private readonly repo: Repository<TimeLog>,
    private readonly projectsService: ProjectsService,
    private readonly accessControl: AccessControlService,
    private readonly dataSource: DataSource,
  ) {}

  private async checkDailyLimitWithLock(
    manager: EntityManager,
    userId: string,
    date: string,
    time: number,
    excludeId?: string,
  ) {
    // Lock user row to prevent concurrent create/update
    // operations from exceeding daily time limit.
    const user = await manager
      .createQueryBuilder(User, 'u')
      .setLock('pessimistic_write')
      .where('u.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const qb = manager
      .createQueryBuilder(TimeLog, 't')
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

  private applyVisibilityFilter(qb: SelectQueryBuilder<TimeLog>, user: User) {
    if (this.accessControl.isSuperAdmin(user)) {
      return;
    }

    if (this.accessControl.isManager(user)) {
      qb.where('project.owner_id = :managerId', {
        managerId: user.id,
      });

      return;
    }

    qb.where('t.user_id = :userId', {
      userId: user.id,
    });
  }

  async list(query: GetTimelogsQuery, user: User) {
    const qb = this.repo
      .createQueryBuilder('t')

      .leftJoinAndSelect('t.projectActivity', 'projectActivity')
      .leftJoinAndSelect('projectActivity.project', 'project')
      .leftJoinAndSelect('projectActivity.activity', 'activity')
      .leftJoinAndSelect('activity.category', 'category');

    this.applyVisibilityFilter(qb, user);

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
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  async getById(id: string, user: User) {
    const log = await this.repo.findOne({
      where: {
        id,
      },

      relations: {
        projectActivity: {
          project: {
            owner: true,
          },
          activity: {
            category: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('TimeLog not found');
    }

    this.accessControl.assertCanViewTimeLog(user, log);

    return log;
  }

  async create(payload: TimeLogPayload, user: User) {
    await this.projectsService.getAccessibleProjectActivity(
      payload.projectActivityId,
      user,
    );

    const { projectActivityId, ...rest } = payload;

    const saved = await this.dataSource.transaction(async (manager) => {
      await this.checkDailyLimitWithLock(
        manager,
        user.id,
        payload.date,
        payload.time,
      );

      const entity = manager.create(TimeLog, {
        ...rest,
        projectActivity: { id: projectActivityId },
        user: { id: user.id },
      });

      return manager.save(entity);
    });

    return this.getById(saved.id, user);
  }

  async update(id: string, payload: UpdateTimelogPayload, user: User) {
    const { projectActivityId, ...rest } = payload;

    if (projectActivityId) {
      await this.projectsService.getAccessibleProjectActivity(
        projectActivityId,
        user,
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const timelog = await manager.findOne(TimeLog, {
        where: { id },
        relations: {
          projectActivity: {
            project: {
              owner: true,
            },
          },
        },
      });

      if (!timelog) {
        throw new NotFoundException('TimeLog not found');
      }

      this.accessControl.assertCanModifyTimeLog(user, timelog);

      if (projectActivityId) {
        timelog.projectActivity = {
          id: projectActivityId,
        } as ProjectActivity;
      }

      Object.assign(timelog, rest);

      await this.checkDailyLimitWithLock(
        manager,
        timelog.userId,
        timelog.date,
        timelog.time,
        id,
      );

      return manager.save(TimeLog, timelog);
    });

    return this.getById(saved.id, user);
  }

  async delete(id: string, user: User) {
    const log = await this.getById(id, user);

    this.accessControl.assertCanDeleteTimeLog(user, log);

    await this.repo.remove(log);

    return { success: true };
  }
}
