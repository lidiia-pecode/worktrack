import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PlanningEntry } from './entities/planning-entry.entity';
import {
  CreatePlanningEntryDto,
  UpdatePlanningEntryDto,
} from './dtos/PlanningEntryPayload.dto';
import { PlanningQueryDto } from './dtos/PlanningQuery.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { ProjectsService } from 'src/projects/projects.service';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(PlanningEntry)
    private readonly repo: Repository<PlanningEntry>,

    @InjectRepository(TimeLog)
    private readonly timeLogRepo: Repository<TimeLog>,

    private readonly usersService: UsersService,
    private readonly projectsService: ProjectsService,
  ) {}

  private assertManagerAccess(user: User) {
    if (!this.usersService.hasManagerAccess(user)) {
      throw new ForbiddenException(
        'Only managers are allowed to perform this action',
      );
    }
  }

  private ensureOwnership(entry: PlanningEntry, user: User) {
    if (
      !this.usersService.hasManagerAccess(user) &&
      entry.employeeId !== user.id
    ) {
      throw new ForbiddenException('You cannot access this resource');
    }
  }

  private async assertNoDuplicate(
    employeeId: string,
    projectId: string,
    date: string,
    excludeId?: string,
  ) {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.employee_id = :employeeId', { employeeId })
      .andWhere('p.project_id = :projectId', { projectId })
      .andWhere('p.date = :date', { date });

    if (excludeId) {
      qb.andWhere('p.id != :excludeId', { excludeId });
    }

    const exists = await qb.getExists();

    if (exists) {
      throw new BadRequestException(
        'A planning entry for this employee, project and date already exists. Edit the existing entry instead.',
      );
    }
  }

  async list(query: PlanningQueryDto, user: User) {
    const isManager = this.usersService.hasManagerAccess(user);

    const employeeId = isManager ? query.employeeId : user.id;

    const qb = this.repo.createQueryBuilder('p');

    if (employeeId) {
      qb.andWhere('p.employee_id = :employeeId', { employeeId });
    }

    if (query.projectId) {
      qb.andWhere('p.project_id = :projectId', {
        projectId: query.projectId,
      });
    }

    if (query.date) {
      qb.andWhere('p.date = :date', { date: query.date });
    } else {
      if (query.dateFrom) {
        qb.andWhere('p.date >= :from', { from: query.dateFrom });
      }
      if (query.dateTo) {
        qb.andWhere('p.date <= :to', { to: query.dateTo });
      }
    }

    const [results, count] = await qb
      .orderBy('p.date', 'ASC')
      .addOrderBy('p.createdAt', 'ASC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  // -------------------------
  // GET ONE
  // -------------------------
  async getById(id: string, user: User) {
    const entry = await this.repo.findOne({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Planning entry not found');
    }

    this.ensureOwnership(entry, user);

    return entry;
  }

  // -------------------------
  // CREATE
  // -------------------------
  async create(payload: CreatePlanningEntryDto, manager: User) {
    this.assertManagerAccess(manager);

    const employee = await this.usersService.getUserById(payload.employeeId);
    if (!this.usersService.canBeProjectMember(employee)) {
      throw new BadRequestException(
        'Planning can only be created for project contributors',
      );
    }

    const project = await this.projectsService.getByIdRaw(payload.projectId);
    this.projectsService.assertProjectIsActive(project);

    await this.assertNoDuplicate(
      payload.employeeId,
      payload.projectId,
      payload.date,
    );

    const entity = this.repo.create({
      employee,
      project,
      createdBy: manager,
      time: payload.time,
      note: payload.note,
      date: payload.date,
    });

    const saved = await this.repo.save(entity);

    return this.getById(saved.id, manager);
  }

  // -------------------------
  // UPDATE
  // -------------------------
  async update(id: string, payload: UpdatePlanningEntryDto, manager: User) {
    this.assertManagerAccess(manager);

    const entry = await this.repo.findOne({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Planning entry not found');
    }

    if (payload.projectId !== undefined) {
      const project = await this.projectsService.getByIdRaw(payload.projectId);

      this.projectsService.assertProjectIsActive(project);

      entry.project = project;
      entry.projectId = project.id;
    }

    if (payload.date !== undefined) {
      entry.date = payload.date;
    }

    if (payload.time !== undefined) {
      entry.time = payload.time;
    }

    if (payload.note !== undefined) {
      entry.note = payload.note;
    }

    await this.assertNoDuplicate(
      entry.employeeId,
      entry.projectId,
      entry.date,
      id,
    );

    const saved = await this.repo.save(entry);

    return this.getById(saved.id, manager);
  }

  // -------------------------
  // DELETE
  // -------------------------
  async delete(id: string, manager: User) {
    this.assertManagerAccess(manager);

    const entry = await this.repo.findOneBy({ id });

    if (!entry) {
      throw new NotFoundException('Planning entry not found');
    }

    await this.repo.remove(entry);

    return { success: true };
  }
}
