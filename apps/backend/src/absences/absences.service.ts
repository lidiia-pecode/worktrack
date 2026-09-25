import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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

import { Absence } from './entities/absence.entity';
import { User } from 'src/users/entities/user.entity';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { ReportingService } from 'src/reporting/reporting.service';
import {
  AbsencePayload,
  UpdateAbsencePayload,
} from './dtos/absence-payload.dto';
import { AbsencesQuery } from './dtos/absences-query.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Injectable()
export class AbsencesService {
  constructor(
    @InjectRepository(Absence)
    private readonly repo: Repository<Absence>,
    private readonly reportingService: ReportingService,
    private readonly teamVisibility: TeamVisibilityService,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // READ
  // ==========================================

  /**
   * Absences overlapping the range, narrowed to the people the caller may see.
   * An absence spanning the edge of the range still belongs in it, so the
   * comparison is an overlap rather than a containment.
   */
  async list(
    query: AbsencesQuery,
    user: AuthUser,
  ): Promise<{ results: Absence[]; count: number }> {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo');
    }

    const qb = this.repo.createQueryBuilder('a');
    this.applyVisibilityFilter(qb, user);

    if (query.userId) {
      if (query.userId !== user.id) {
        await this.teamVisibility.assertCanActForUser(query.userId, user, {
          action: 'view',
          subject: 'absences',
        });
      }
      qb.andWhere('a.userId = :userId', { userId: query.userId });
    }

    if (query.dateFrom) {
      qb.andWhere('a.endDate >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('a.startDate <= :dateTo', { dateTo: query.dateTo });
    }

    const [results, count] = await qb
      .orderBy('a.startDate', 'DESC')
      .addOrderBy('a.createdAt', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { results, count };
  }

  // ==========================================
  // WRITE
  // ==========================================

  async create(payload: AbsencePayload, user: AuthUser): Promise<Absence> {
    const ownerId = payload.userId ?? user.id;
    await this.assertCanWriteFor(ownerId, user);

    this.assertRangeOrder(payload.startDate, payload.endDate);
    await this.assertRangeNotLocked(
      user.companyId,
      payload.startDate,
      payload.endDate,
    );

    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, ownerId, user.companyId);

      await this.assertRangeIsFree(
        manager,
        ownerId,
        user.companyId,
        payload.startDate,
        payload.endDate,
      );

      const entity = manager.create(Absence, {
        companyId: user.companyId,
        userId: ownerId,
        type: payload.type,
        startDate: payload.startDate,
        endDate: payload.endDate,
        note: payload.note,
      });

      return manager.save(entity);
    });
  }

  async update(
    id: string,
    payload: UpdateAbsencePayload,
    user: AuthUser,
  ): Promise<Absence> {
    const ownerId = await this.resolveWritableOwner(id, user);

    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, ownerId, user.companyId);

      const absence = await this.getForUpdate(id, user.companyId, manager);

      // Where it sits now is frozen, and so is wherever it is being moved to.
      await this.assertRangeNotLocked(
        user.companyId,
        absence.startDate,
        absence.endDate,
      );

      const startDate = payload.startDate ?? absence.startDate;
      const endDate = payload.endDate ?? absence.endDate;
      this.assertRangeOrder(startDate, endDate);

      const moved =
        startDate !== absence.startDate || endDate !== absence.endDate;

      if (moved) {
        await this.assertRangeNotLocked(user.companyId, startDate, endDate);
      }

      absence.startDate = startDate;
      absence.endDate = endDate;
      if (payload.type !== undefined) absence.type = payload.type;
      if (payload.note !== undefined) absence.note = payload.note;

      await this.assertRangeIsFree(
        manager,
        ownerId,
        user.companyId,
        startDate,
        endDate,
        id,
      );

      return manager.save(Absence, absence);
    });
  }

  async delete(id: string, user: AuthUser): Promise<{ success: boolean }> {
    const ownerId = await this.resolveWritableOwner(id, user);

    await this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, ownerId, user.companyId);
      const absence = await this.getForUpdate(id, user.companyId, manager);

      await this.assertRangeNotLocked(
        user.companyId,
        absence.startDate,
        absence.endDate,
      );

      await manager.remove(Absence, absence);
    });

    return { success: true };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private applyVisibilityFilter(
    qb: SelectQueryBuilder<Absence>,
    user: AuthUser,
  ): void {
    qb.andWhere('a.companyId = :companyId', { companyId: user.companyId });
    this.teamVisibility.applyUserVisibility(qb, 'a.user_id', user, {
      includeSelf: true,
    });
  }

  private assertRangeOrder(startDate: string, endDate: string): void {
    if (startDate > endDate) {
      throw new BadRequestException('startDate cannot be after endDate');
    }
  }

  /**
   * An absence is frozen as soon as any day of its range falls in a locked
   * period, so a holiday spanning the boundary cannot be edited from outside.
   */
  private async assertRangeNotLocked(
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    const isLocked = await this.reportingService.isRangeLocked(
      companyId,
      startDate,
      endDate,
    );

    if (isLocked) {
      throw new ForbiddenException(
        `Cannot modify absences between ${startDate} and ${endDate} because the range touches a LOCKED reporting period.`,
      );
    }
  }

  /**
   * A day is either worked or absent, never both, and two absences may not
   * cover the same day. Time logs are read straight from their table so the
   * two services do not have to depend on each other.
   */
  private async assertRangeIsFree(
    manager: EntityManager,
    userId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    excludeId?: string,
  ): Promise<void> {
    const loggedDays = await manager
      .createQueryBuilder()
      .select(`DISTINCT TO_CHAR(t.date, 'YYYY-MM-DD')`, 'date')
      .from('time_logs', 't')
      .where('t.company_id = :companyId', { companyId })
      .andWhere('t.user_id = :userId', { userId })
      .andWhere('t.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string }>();

    if (loggedDays.length > 0) {
      const dates = loggedDays.map((row) => row.date).join(', ');
      throw new ConflictException(
        `Time is already logged on ${dates}. A day cannot be both worked and absent, so remove that time first.`,
      );
    }

    const overlapQuery = manager
      .createQueryBuilder(Absence, 'a')
      .where('a.companyId = :companyId', { companyId })
      .andWhere('a.userId = :userId', { userId })
      .andWhere('a.startDate <= :endDate', { endDate })
      .andWhere('a.endDate >= :startDate', { startDate });

    if (excludeId) {
      overlapQuery.andWhere('a.id != :excludeId', { excludeId });
    }

    const overlapping = await overlapQuery.getOne();

    if (overlapping) {
      throw new ConflictException(
        `An absence already covers ${overlapping.startDate} to ${overlapping.endDate}. Absences cannot overlap.`,
      );
    }
  }

  /**
   * Who the absence belongs to, once the caller is allowed to write for them.
   * Read before the transaction so the owner's row is the one locked, rather
   * than the caller's.
   */
  private async resolveWritableOwner(
    id: string,
    user: AuthUser,
  ): Promise<string> {
    const absence = await this.repo.findOne({
      where: { id, companyId: user.companyId },
      select: ['id', 'userId'],
    });

    if (!absence) throw new NotFoundException('Absence not found');

    await this.assertCanWriteFor(absence.userId, user);

    return absence.userId;
  }

  private async getForUpdate(
    id: string,
    companyId: string,
    manager: EntityManager,
  ): Promise<Absence> {
    const absence = await manager.findOne(Absence, {
      where: { id, companyId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!absence) throw new NotFoundException('Absence not found');
    return absence;
  }

  /**
   * Serializes writes per person by locking the user row, the way time logs
   * do, so a concurrent time log and absence cannot both see a free day.
   */
  private async lockUser(
    manager: EntityManager,
    userId: string,
    companyId: string,
  ): Promise<void> {
    const user = await manager
      .createQueryBuilder(User, 'u')
      .setLock('pessimistic_write')
      .where('u.id = :userId', { userId })
      .andWhere('u.company_id = :companyId', { companyId })
      .getOne();

    if (!user) throw new NotFoundException('User not found');
  }

  /**
   * Recording an absence for somebody follows the time-log write scope, so the
   * two can never disagree about who may speak for whom.
   */
  private assertCanWriteFor(ownerId: string, user: AuthUser): Promise<void> {
    if (ownerId === user.id) return Promise.resolve();

    return this.teamVisibility.assertCanActForUser(ownerId, user, {
      action: 'change',
      subject: 'absences',
    });
  }
}
