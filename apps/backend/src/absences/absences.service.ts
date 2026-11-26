import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { Absence } from './entities/absence.entity';
import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/user-role.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { DateRange, isWithinSpan } from 'src/teams/days-in-view.util';
import { NotificationsService } from 'src/notifications/notifications.service';
import type { PlansRemovedDetails } from 'src/notifications/entities/notification.entity';
import { lockUser } from 'src/users/lock-user.util';
import {
  lockedMonthError,
  PeriodLocksService,
} from 'src/reporting/period-locks.service';
import { CapacityService } from 'src/capacity/capacity.service';
import {
  addDays,
  isWorkingDay,
  weekendWorkHint,
} from 'src/capacity/working-days.util';
import { formatDay } from 'src/lib/utils/format-day.util';
import { formatMinutes } from 'src/lib/utils/format-minutes.util';
import { MAX_RANGE_DAYS } from 'src/reporting/date-range.util';
import { lastDayOfMonth } from 'src/reporting/reporting-months.util';
import {
  AbsencePayload,
  UpdateAbsencePayload,
} from './dtos/absence-payload.dto';
import { AbsenceDayQuery, AbsencesQuery } from './dtos/absences-query.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { pageOffset } from 'src/lib/dtos/pagination-query.dto';

/** A person's day as the absence form measures part of it. */
export interface AbsenceDayRoom {
  date: string;
  workingMinutes: number;
  loggedMinutes: number;
  plannedMinutes: number;
}

/**
 * A plan an absence removed, with who planned it — whoever changed it last,
 * or its author when nobody did — for telling them.
 */
interface RemovedPlan {
  id: string;
  plannerId: string | null;
  projectName: string;
  minutes: number;
  date: string;
}

@Injectable()
export class AbsencesService {
  constructor(
    @InjectRepository(Absence)
    private readonly repo: Repository<Absence>,
    private readonly periodLocks: PeriodLocksService,
    private readonly teamVisibility: TeamVisibilityService,
    private readonly capacity: CapacityService,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // READ
  // ==========================================

  /**
   * Absences overlapping the range, narrowed to the people the caller may see,
   * each saying whether the caller may change it. An absence spanning the
   * edge of the range still belongs in it, so the comparison is an overlap
   * rather than a containment.
   */
  async list(
    query: AbsencesQuery,
    user: AuthUser,
  ): Promise<{ results: Absence[]; count: number }> {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo');
    }

    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoin('a.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.firstName', 'createdBy.lastName'])
      .leftJoin('a.updatedBy', 'updatedBy')
      .addSelect(['updatedBy.id', 'updatedBy.firstName', 'updatedBy.lastName']);
    this.applyVisibilityFilter(qb, user);
    this.teamVisibility.applyTeamMembershipFilter(
      qb,
      'a.user_id',
      query.teamId,
      user,
      { startColumn: 'a.start_date', endColumn: 'a.end_date' },
    );

    if (query.userId) {
      await this.teamVisibility.assertCanReadUser(query.userId, user, {
        action: 'view',
        subject: 'absences',
      });
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
      .skip(pageOffset(query))
      .take(query.pageSize)
      .getManyAndCount();

    await this.markChangeable(results, user);

    return { results, count };
  }

  /**
   * Sets `canChange` on each absence: the write rule, every day of it within
   * the caller's reach, worked out from one reach query for the whole list.
   * An owner and the person themselves reach every day.
   */
  private async markChangeable(
    absences: Absence[],
    user: AuthUser,
  ): Promise<void> {
    if (absences.length === 0) return;

    const inView = await this.teamVisibility.daysInView(
      user,
      [...new Set(absences.map((absence) => absence.userId))],
      {
        from: absences.reduce(
          (min, { startDate }) => (startDate < min ? startDate : min),
          absences[0].startDate,
        ),
        to: absences.reduce(
          (max, { endDate }) => (endDate > max ? endDate : max),
          absences[0].endDate,
        ),
      },
    );

    for (const absence of absences) {
      const outside = inView.get(absence.userId)?.outside ?? [];
      absence.canChange = !outside.some(
        (span) =>
          span.from <= absence.endDate &&
          (span.until === null || absence.startDate < span.until),
      );
    }
  }

  /**
   * What a day holds for someone, for the absence form to measure part of it
   * against: their working day, the time logged and the time planned. Read
   * with the absence write scope, since only who records one needs it.
   */
  async dayFor(
    query: AbsenceDayQuery,
    user: AuthUser,
  ): Promise<AbsenceDayRoom> {
    const ownerId = query.userId ?? user.id;
    const { date } = query;
    await this.assertCanWriteFor(ownerId, user, { from: date, to: date });

    const manager = this.dataSource.manager;
    const [workingMinutes, loggedMinutes, plannedMinutes] = await Promise.all([
      this.workingMinutesOn(user.companyId, ownerId, date),
      this.sumMinutesOn(
        manager,
        'time_logs',
        'minutes',
        user.companyId,
        ownerId,
        date,
      ),
      this.sumMinutesOn(
        manager,
        'planning_entries',
        'planned_minutes',
        user.companyId,
        ownerId,
        date,
      ),
    ]);

    return { date, workingMinutes, loggedMinutes, plannedMinutes };
  }

  // ==========================================
  // WRITE
  // ==========================================

  async create(payload: AbsencePayload, user: AuthUser): Promise<Absence> {
    const ownerId = payload.userId ?? user.id;
    await this.assertCanWriteFor(ownerId, user, {
      from: payload.startDate,
      to: payload.endDate,
    });

    const minutes = payload.minutes ?? null;
    this.assertRange(payload.startDate, payload.endDate, minutes);

    return this.dataSource.transaction(async (manager) => {
      await lockUser(manager, ownerId, user.companyId);
      await this.assertRangeNotLocked(
        manager,
        user.companyId,
        payload.startDate,
        payload.endDate,
      );
      await this.capacity.assertEmployedOn(
        manager,
        user.companyId,
        ownerId,
        payload.startDate,
        payload.endDate,
      );

      await this.assertRangeIsFree(
        manager,
        ownerId,
        user.companyId,
        payload.startDate,
        payload.endDate,
        minutes === null ? null : { minutes, recheck: true },
      );
      // Part of a day keeps the day's plans; a whole day takes them off.
      const removedPlans =
        minutes === null
          ? await this.removePlansOn(
              manager,
              ownerId,
              user.companyId,
              payload.startDate,
              payload.endDate,
            )
          : [];

      const entity = manager.create(Absence, {
        companyId: user.companyId,
        userId: ownerId,
        type: payload.type,
        startDate: payload.startDate,
        endDate: payload.endDate,
        minutes,
        note: payload.note,
        createdById: user.id,
      });

      const saved = await manager.save(entity);
      await this.tellPlanners(manager, ownerId, user, removedPlans);
      return saved;
    });
  }

  async update(
    id: string,
    payload: UpdateAbsencePayload,
    user: AuthUser,
  ): Promise<Absence> {
    const ownerId = await this.resolveWritableOwner(id, user, payload);

    return this.dataSource.transaction(async (manager) => {
      await lockUser(manager, ownerId, user.companyId);

      const absence = await this.getForUpdate(id, user.companyId, manager);

      const startDate = payload.startDate ?? absence.startDate;
      const endDate = payload.endDate ?? absence.endDate;
      const minutes =
        payload.minutes === undefined ? absence.minutes : payload.minutes;
      const moved =
        startDate !== absence.startDate || endDate !== absence.endDate;
      const isUnchanged =
        !moved &&
        minutes === absence.minutes &&
        (payload.type === undefined || payload.type === absence.type) &&
        (payload.note === undefined || payload.note === (absence.note ?? null));
      // Nothing to save, so "Changed by" stays with whoever last changed it.
      if (isUnchanged) return absence;

      this.assertRange(startDate, endDate, minutes);

      const lockedDays = await this.assertLockedDaysKept(
        manager,
        user.companyId,
        absence,
        {
          startDate,
          endDate,
          minutes,
          type: payload.type,
          note: payload.note,
        },
      );

      if (moved) {
        await this.capacity.assertEmployedOn(
          manager,
          user.companyId,
          ownerId,
          startDate,
          endDate,
        );
      }

      // A part of a day is measured against the time logged when its day
      // changes or its hours grow: not on a later edit of its reason or note,
      // nor when it is shortened, which only frees the day.
      const recheckPart =
        moved ||
        absence.minutes === null ||
        (minutes !== null && minutes > absence.minutes);

      absence.startDate = startDate;
      absence.endDate = endDate;
      absence.minutes = minutes;
      if (payload.type !== undefined) absence.type = payload.type;
      if (payload.note !== undefined) absence.note = payload.note;
      absence.updatedById = user.id;

      await this.assertRangeIsFree(
        manager,
        ownerId,
        user.companyId,
        startDate,
        endDate,
        minutes === null ? null : { minutes, recheck: recheckPart },
        id,
      );
      const removedPlans =
        minutes === null
          ? await this.removePlansOn(
              manager,
              ownerId,
              user.companyId,
              startDate,
              endDate,
              lockedDays,
            )
          : [];

      const saved = await manager.save(Absence, absence);
      await this.tellPlanners(manager, ownerId, user, removedPlans);
      return saved;
    });
  }

  /** `trimmed` when only its open days went, its days in a locked month kept. */
  async delete(
    id: string,
    user: AuthUser,
  ): Promise<{ success: boolean; trimmed: boolean }> {
    const ownerId = await this.resolveWritableOwner(id, user);

    const trimmed = await this.dataSource.transaction(async (manager) => {
      await lockUser(manager, ownerId, user.companyId);
      const absence = await this.getForUpdate(id, user.companyId, manager);
      const lockedDays = lockedDaysIn(
        await this.periodLocks.lockedMonthsIn(
          user.companyId,
          absence.startDate,
          absence.endDate,
          manager,
        ),
        absence.startDate,
        absence.endDate,
      );

      if (lockedDays.length === 0) {
        await manager.remove(Absence, absence);
        return false;
      }

      // Its days in a locked month stay; only the open ones around them go.
      const keepFrom = lockedDays[0].from;
      const keepTo = lockedDays[lockedDays.length - 1].to;
      const keepsEveryDay =
        keepFrom === absence.startDate && keepTo === absence.endDate;
      const hasOpenDaysBetween = lockedDays.some(
        (span, i) => i > 0 && span.from !== addDays(lockedDays[i - 1].to, 1),
      );
      if (keepsEveryDay || hasOpenDaysBetween) {
        throw lockedMonthError(
          `Cannot delete the absence from ${formatDay(absence.startDate)} to ${formatDay(absence.endDate)}: its days in a locked reporting period stay as they are.`,
        );
      }

      absence.startDate = keepFrom;
      absence.endDate = keepTo;
      absence.updatedById = user.id;
      await manager.save(Absence, absence);
      return true;
    });

    return { success: true, trimmed };
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
      onDays: { startColumn: 'a.start_date', endColumn: 'a.end_date' },
    });
  }

  /**
   * In order, and no longer than the range reports and planning take; part of
   * a day is for one day only.
   */
  private assertRange(
    startDate: string,
    endDate: string,
    minutes: number | null,
  ): void {
    if (startDate > endDate) {
      throw new BadRequestException('startDate cannot be after endDate');
    }
    if (endDate > addDays(startDate, MAX_RANGE_DAYS - 1)) {
      throw new BadRequestException(
        `An absence can last at most ${MAX_RANGE_DAYS} days.`,
      );
    }
    if (minutes !== null && startDate !== endDate) {
      throw new BadRequestException(
        'An absence for part of a day covers one day only.',
      );
    }
  }

  /**
   * A new absence may not touch a locked period. Runs inside the write's
   * transaction, so a Close at the same moment waits for it.
   */
  private async assertRangeNotLocked(
    manager: EntityManager,
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    const isLocked = await this.periodLocks.isRangeLocked(
      companyId,
      startDate,
      endDate,
      manager,
    );

    if (isLocked) {
      throw lockedMonthError(
        `Cannot record an absence from ${formatDay(startDate)} to ${formatDay(endDate)}: it touches a locked reporting period.`,
      );
    }
  }

  /**
   * A change may move an absence's open days, but not one of its days in a
   * locked month: those stay covered, and nothing is added there. Its reason
   * and note belong to every day, so they stay too while any of them is
   * locked. Runs inside the write's transaction, as the lock check does.
   */
  private async assertLockedDaysKept(
    manager: EntityManager,
    companyId: string,
    absence: Absence,
    next: Pick<Absence, 'startDate' | 'endDate' | 'minutes'> &
      Pick<UpdateAbsencePayload, 'type' | 'note'>,
  ): Promise<DateRange[]> {
    const lockedMonths = await this.periodLocks.lockedMonthsIn(
      companyId,
      absence.startDate < next.startDate ? absence.startDate : next.startDate,
      absence.endDate > next.endDate ? absence.endDate : next.endDate,
      manager,
    );
    if (lockedMonths.length === 0) return [];

    const before = lockedDaysIn(
      lockedMonths,
      absence.startDate,
      absence.endDate,
    );
    const after = lockedDaysIn(lockedMonths, next.startDate, next.endDate);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw lockedMonthError(
        `Cannot change the absence to ${formatDay(next.startDate)} – ${formatDay(next.endDate)}: its days in a locked reporting period stay as they are.`,
      );
    }

    const changesWholeRecord =
      next.minutes !== absence.minutes ||
      (next.type !== undefined && next.type !== absence.type) ||
      (next.note !== undefined && next.note !== (absence.note ?? null));
    if (before.length > 0 && changesWholeRecord) {
      const kept =
        absence.minutes === null && next.minutes === null
          ? 'reason and note'
          : 'reason, hours and note';
      throw lockedMonthError(
        `Part of this absence is in a locked month, so its ${kept} stay as they are.`,
      );
    }

    return after;
  }

  /**
   * A whole day is either worked or absent, never both; part of a day fits
   * beside the time logged on it (`assertPartFits`, when `recheck`). Two
   * absences may not cover the same day. Time logs are read straight from
   * their table so the two services do not have to depend on each other.
   */
  private async assertRangeIsFree(
    manager: EntityManager,
    userId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    partDay: { minutes: number; recheck: boolean } | null,
    excludeId?: string,
  ): Promise<void> {
    if (partDay) {
      if (partDay.recheck) {
        await this.assertPartFits(
          manager,
          userId,
          companyId,
          startDate,
          partDay.minutes,
        );
      }
    } else {
      await this.assertNoTimeLogged(
        manager,
        userId,
        companyId,
        startDate,
        endDate,
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
        `An absence already covers ${formatDay(overlapping.startDate)} to ${formatDay(overlapping.endDate)}. Absences cannot overlap.`,
      );
    }
  }

  /**
   * Part of a day is taken from a working day with working hours, is shorter
   * than that day, and fits in what the time logged on it leaves.
   */
  private async assertPartFits(
    manager: EntityManager,
    userId: string,
    companyId: string,
    date: string,
    minutes: number,
  ): Promise<void> {
    const workingDay = await this.workingMinutesOn(
      companyId,
      userId,
      date,
      manager,
    );
    if (workingDay === 0) {
      throw new BadRequestException(
        `${formatDay(date)} has no working hours, so part of it can't be taken off.`,
      );
    }
    if (minutes >= workingDay) {
      throw new BadRequestException(
        `Part of a day must be shorter than the ${formatMinutes(workingDay)} working day. Record the whole day instead.`,
      );
    }

    const loggedMinutes = await this.sumMinutesOn(
      manager,
      'time_logs',
      'minutes',
      companyId,
      userId,
      date,
    );
    const left = Math.max(0, workingDay - loggedMinutes);

    if (minutes > left) {
      throw new ConflictException(
        `Only ${formatMinutes(left)} of ${formatDay(date)} is left: ${formatMinutes(loggedMinutes)} is already logged.`,
      );
    }
  }

  /** The person's working day on a date, in whole minutes; 0 on a weekend. */
  private async workingMinutesOn(
    companyId: string,
    userId: string,
    date: string,
    manager?: EntityManager,
  ): Promise<number> {
    if (!isWorkingDay(date)) return 0;
    const timeline = await this.capacity.timelineFor(
      companyId,
      userId,
      date,
      manager,
    );
    return Math.floor(timeline.minutesPerDayOn(date));
  }

  /** Time logged or planned for the person on a date, read straight from its table. */
  private async sumMinutesOn(
    manager: EntityManager,
    table: 'time_logs' | 'planning_entries',
    column: 'minutes' | 'planned_minutes',
    companyId: string,
    userId: string,
    date: string,
  ): Promise<number> {
    const row = await manager
      .createQueryBuilder()
      .select(`COALESCE(SUM(r.${column}), 0)`, 'minutes')
      .from(table, 'r')
      .where('r.company_id = :companyId', { companyId })
      .andWhere('r.user_id = :userId', { userId })
      .andWhere('r.date = :date', { date })
      .getRawOne<{ minutes: string }>();
    return Number(row?.minutes ?? 0);
  }

  private async assertNoTimeLogged(
    manager: EntityManager,
    userId: string,
    companyId: string,
    startDate: string,
    endDate: string,
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
      const dates = loggedDays.map((row) => row.date);
      const weekendDates = dates.filter((date) => !isWorkingDay(date));
      const weekendHint =
        weekendDates.length > 0
          ? weekendWorkHint(weekendDates, startDate, endDate)
          : '';
      throw new ConflictException(
        `Time is already logged on ${dates.map((date) => formatDay(date)).join(', ')}. A day cannot be both worked and absent, so remove that time first.${weekendHint}`,
      );
    }
  }

  /**
   * A day the person is away is not a planned day, so recording an absence
   * removes their plans on it, whoever made them, except on its days in a
   * locked month (`lockedDays`), which nothing changes. Returns what went,
   * read just before the delete under the person's lock, which plan saves
   * also take.
   */
  private async removePlansOn(
    manager: EntityManager,
    userId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    lockedDays: DateRange[] = [],
  ): Promise<RemovedPlan[]> {
    const query = manager
      .createQueryBuilder()
      .select('p.id', 'id')
      .addSelect('COALESCE(p.updated_by_id, p.created_by_id)', 'plannerId')
      .addSelect('project.name', 'projectName')
      .addSelect('p.planned_minutes', 'minutes')
      .addSelect(`TO_CHAR(p.date, 'YYYY-MM-DD')`, 'date')
      .from('planning_entries', 'p')
      .innerJoin('projects', 'project', 'project.id = p.project_id')
      .where('p.company_id = :companyId', { companyId })
      .andWhere('p.user_id = :userId', { userId })
      .andWhere('p.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    lockedDays.forEach(({ from, to }, i) =>
      query.andWhere(`p.date NOT BETWEEN :lockedFrom${i} AND :lockedTo${i}`, {
        [`lockedFrom${i}`]: from,
        [`lockedTo${i}`]: to,
      }),
    );
    const removed = await query.getRawMany<RemovedPlan>();

    if (removed.length > 0) {
      await manager
        .createQueryBuilder()
        .delete()
        .from('planning_entries')
        .where('id IN (:...ids)', { ids: removed.map((plan) => plan.id) })
        .execute();
    }

    return removed;
  }

  /**
   * Tells whoever planned the removed plans (see `RemovedPlan`), except
   * whoever recorded the absence, about those on days they can still read for
   * the person, so a notice never reaches past their teams. Someone who has left, or reaches
   * none of those days, is told nothing; the absence's type is never named.
   */
  private async tellPlanners(
    manager: EntityManager,
    ownerId: string,
    recorder: AuthUser,
    removed: RemovedPlan[],
  ): Promise<void> {
    const plannerIds = [
      ...new Set(
        removed
          .map((plan) => plan.plannerId)
          .filter((id): id is string => id !== null && id !== recorder.id),
      ),
    ];
    if (plannerIds.length === 0) return;

    const planners = await manager.find(User, {
      where: {
        id: In(plannerIds),
        companyId: recorder.companyId,
        status: UserStatus.ACTIVE,
      },
      select: ['id', 'email', 'companyId', 'role'],
    });

    for (const planner of planners) {
      const theirs = removed.filter((plan) => plan.plannerId === planner.id);
      const dates = theirs.map((plan) => plan.date).sort();
      const inView = await this.teamVisibility.daysInView(
        planner,
        [ownerId],
        { from: dates[0], to: dates[dates.length - 1] },
        undefined,
        manager,
      );
      const outside = inView.get(ownerId)?.outside ?? [];
      const reached = theirs.filter(
        (plan) => !outside.some((span) => isWithinSpan(span, plan.date)),
      );
      if (reached.length === 0) continue;

      await this.notifications.notifyPlansRemoved(manager, {
        companyId: recorder.companyId,
        recipientId: planner.id,
        subjectUserId: ownerId,
        details: summarisePlans(reached),
      });
    }
  }

  /**
   * Who the absence belongs to, once the caller is allowed to write for them
   * on every day it covers, and on every day it moves to. Read before the
   * transaction so the owner's row is the one locked, rather than the
   * caller's.
   */
  private async resolveWritableOwner(
    id: string,
    user: AuthUser,
    moveTo?: { startDate?: string; endDate?: string },
  ): Promise<string> {
    // Read as the caller reads it, so an absence out of their reach is not
    // found rather than refused, and its id tells nothing.
    const qb = this.repo
      .createQueryBuilder('a')
      .select(['a.id', 'a.userId', 'a.startDate', 'a.endDate'])
      .where('a.id = :id', { id });
    this.applyVisibilityFilter(qb, user);
    const absence = await qb.getOne();

    if (!absence) throw new NotFoundException('Absence not found');

    const { userId, startDate, endDate } = absence;
    await this.assertCanWriteFor(userId, user, {
      from: startDate,
      to: endDate,
    });

    const newStart = moveTo?.startDate ?? startDate;
    const newEnd = moveTo?.endDate ?? endDate;
    if (newStart !== startDate || newEnd !== endDate) {
      await this.assertCanWriteFor(userId, user, {
        from: newStart,
        to: newEnd,
      });
    }

    return userId;
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
   * Recording an absence for somebody follows the time-log write scope, so the
   * two can never disagree about who may speak for whom: every day of it has
   * to be within the caller's reach.
   */
  private assertCanWriteFor(
    ownerId: string,
    user: AuthUser,
    days: DateRange,
  ): Promise<void> {
    return this.teamVisibility.assertCanWriteUser(
      ownerId,
      user,
      { action: 'change', subject: 'absences' },
      days,
    );
  }
}

/** The days, count and hours per project of the plans someone is told about. */
const summarisePlans = (plans: RemovedPlan[]): PlansRemovedDetails => {
  const dates = plans.map((plan) => plan.date).sort();
  const minutesByProject = new Map<string, number>();
  for (const plan of plans) {
    minutesByProject.set(
      plan.projectName,
      (minutesByProject.get(plan.projectName) ?? 0) + plan.minutes,
    );
  }

  return {
    from: dates[0],
    to: dates[dates.length - 1],
    planCount: plans.length,
    projects: [...minutesByProject]
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
};

/** An absence's days in each locked month, as first and last day, oldest first. */
const lockedDaysIn = (
  lockedMonths: string[],
  startDate: string,
  endDate: string,
): DateRange[] =>
  lockedMonths
    .map((month) => {
      const lastDay = lastDayOfMonth(month);
      return {
        from: startDate > month ? startDate : month,
        to: endDate < lastDay ? endDate : lastDay,
      };
    })
    .filter((span) => span.from <= span.to);
