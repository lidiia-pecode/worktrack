import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { todayISODate } from 'src/capacity/working-days.util';
import {
  freezeAtFirstLockedSecond,
  freezeAtLastGraceSecond,
  timeZoneOnAnotherDay,
} from 'src/lib/testing/time-zones';
import { Team } from 'src/teams/entities/team.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { ReportingPeriod } from './entities/reporting-period.entity';
import { ReportingMonthState } from './enums/reporting-month-state.enum';
import { HoursReportGroupBy } from './enums/hours-report-group-by.enum';
import { ReportingService } from './reporting.service';
import {
  addMonths,
  editableUntil,
  firstDayOfMonth,
  isAutoLocked,
  lastDayOfMonth,
  latestAutoLockedMonth,
  monthsBetween,
  toMonthKey,
} from './reporting-months.util';

describe('reporting months', () => {
  it('keeps a month editable for seven days after it ends', () => {
    expect(editableUntil('2026-01-01')).toBe('2026-02-07');
    expect(isAutoLocked('2026-01-01', '2026-02-07')).toBe(false);
    expect(isAutoLocked('2026-01-01', '2026-02-08')).toBe(true);
  });

  it('carries the grace window across a year end', () => {
    expect(editableUntil('2025-12-01')).toBe('2026-01-07');
    expect(latestAutoLockedMonth('2026-01-07')).toBe('2025-11-01');
    expect(latestAutoLockedMonth('2026-01-08')).toBe('2025-12-01');
  });

  it('finds the last day of a month, leap years included', () => {
    expect(lastDayOfMonth('2028-02-01')).toBe('2028-02-29');
    expect(lastDayOfMonth('2026-02-01')).toBe('2026-02-28');
  });

  it('converts between dates, first days and month keys', () => {
    expect(firstDayOfMonth('2026-03-17')).toBe('2026-03-01');
    expect(firstDayOfMonth('2026-03')).toBe('2026-03-01');
    expect(toMonthKey('2026-03-17')).toBe('2026-03');
  });

  it('lists every month in a range', () => {
    expect(monthsBetween('2025-11-15', '2026-02-03')).toEqual([
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
    ]);
  });
});

/**
 * Runs against the development database, so it needs the Docker stack. Dates
 * are relative to today, because the lock itself is.
 */

const RUN = Date.now();
const SLUG = `reporting-test-${RUN}`;

describe('ReportingService', () => {
  let dataSource: DataSource;
  let service: ReportingService;
  let companyId: string;
  let ownerId: string;

  const today = todayISODate('UTC');
  const thisMonth = firstDayOfMonth(today);
  // Three months back is always past its grace window.
  const lockedMonth = addMonths(thisMonth, -3);
  const lockedMonthKey = toMonthKey(lockedMonth);
  const lockedDate = `${lockedMonthKey}-15`;
  const newestLocked = latestAutoLockedMonth(today);

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    service = new ReportingService(
      dataSource.getRepository(ReportingPeriod),
      dataSource.getRepository(Company),
      new TeamVisibilityService(
        dataSource.getRepository(TeamMembership),
        dataSource.getRepository(User),
      ),
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG, timezone: 'UTC' });
    companyId = company.id;

    const owner = await dataSource.getRepository(User).save({
      companyId,
      role: UserRole.OWNER,
      firstName: 'Owner',
      lastName: 'Test',
      email: `owner-${RUN}@reporting.test`,
    });
    ownerId = owner.id;
  });

  afterEach(async () => {
    await dataSource.getRepository(ReportingPeriod).delete({ companyId });
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });
    await dataSource.destroy();
  });

  describe('automatic locking', () => {
    it('leaves the current month open', async () => {
      await expect(service.isDateLocked(companyId, today)).resolves.toBe(false);
    });

    it('locks a month once its grace window has passed', async () => {
      await expect(service.isDateLocked(companyId, lockedDate)).resolves.toBe(
        true,
      );
    });

    it('locks a range as soon as it touches a locked month', async () => {
      await expect(
        service.isRangeLocked(companyId, lockedDate, today),
      ).resolves.toBe(true);
    });

    it('reports the end of the newest locked month', async () => {
      await expect(service.latestLockedDate(companyId)).resolves.toBe(
        lastDayOfMonth(newestLocked),
      );
    });
  });

  describe('reopening', () => {
    it('makes a locked month writable until it is closed again', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);
      await expect(service.isDateLocked(companyId, lockedDate)).resolves.toBe(
        false,
      );

      await service.closeMonth(companyId, lockedMonthKey, ownerId);
      await expect(service.isDateLocked(companyId, lockedDate)).resolves.toBe(
        true,
      );
    });

    it('can reopen a month that was closed again', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);
      await service.closeMonth(companyId, lockedMonthKey, ownerId);
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      await expect(service.isDateLocked(companyId, lockedDate)).resolves.toBe(
        false,
      );
    });

    it('skips a reopened month when finding the newest locked one', async () => {
      await service.reopenMonth(companyId, toMonthKey(newestLocked), ownerId);

      await expect(service.latestLockedDate(companyId)).resolves.toBe(
        lastDayOfMonth(addMonths(newestLocked, -1)),
      );
    });

    it('refuses a month that has not locked yet', async () => {
      await expect(
        service.reopenMonth(companyId, toMonthKey(thisMonth), ownerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses reopening twice', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      await expect(
        service.reopenMonth(companyId, lockedMonthKey, ownerId),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses closing a month that was never reopened', async () => {
      await expect(
        service.closeMonth(companyId, lockedMonthKey, ownerId),
      ).rejects.toThrow(ConflictException);
    });

    it('records who made the change', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      const row = await dataSource
        .getRepository(ReportingPeriod)
        .findOneByOrFail({ companyId, month: lockedMonth });
      expect(row.changedById).toBe(ownerId);
    });
  });

  describe('listing months', () => {
    it('lists twelve months newest first, each with its state', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      const months = await service.listMonths(companyId, {});

      expect(months).toHaveLength(12);
      expect(months[0]).toEqual({
        month: toMonthKey(thisMonth),
        state: ReportingMonthState.OPEN,
        editableUntil: editableUntil(thisMonth),
      });
      expect(months.find((m) => m.month === lockedMonthKey)).toEqual({
        month: lockedMonthKey,
        state: ReportingMonthState.REOPENED,
        editableUntil: null,
      });
      expect(
        months.find((m) => m.month === toMonthKey(addMonths(thisMonth, -4)))
          ?.state,
      ).toBe(ReportingMonthState.LOCKED);
    });

    it('shows last month in its grace window during the first week', async () => {
      const lastMonth = addMonths(thisMonth, -1);
      const [, previous] = await service.listMonths(companyId, {});

      expect(previous.state).toBe(
        isAutoLocked(lastMonth, today)
          ? ReportingMonthState.LOCKED
          : ReportingMonthState.GRACE,
      );
    });

    it('refuses a range that runs backwards', async () => {
      await expect(
        service.listMonths(companyId, { from: '2026-05', to: '2026-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("locking on the company's clock", () => {
    const TIME_ZONE = timeZoneOnAnotherDay();
    const MONTH = '2026-01-01';

    const stateOfMonth = async () => {
      const [month] = await service.listMonths(companyId, {
        from: '2026-01',
        to: '2026-01',
      });
      return month.state;
    };

    beforeAll(async () => {
      await dataSource
        .getRepository(Company)
        .update({ id: companyId }, { timezone: TIME_ZONE });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    afterAll(async () => {
      await dataSource
        .getRepository(Company)
        .update({ id: companyId }, { timezone: 'UTC' });
    });

    it("keeps a month in grace until the company's midnight on the 8th", async () => {
      freezeAtLastGraceSecond(MONTH, TIME_ZONE);

      await expect(stateOfMonth()).resolves.toBe(ReportingMonthState.GRACE);
      await expect(service.isDateLocked(companyId, '2026-01-31')).resolves.toBe(
        false,
      );
    });

    it('locks it from that midnight', async () => {
      freezeAtFirstLockedSecond(MONTH, TIME_ZONE);

      await expect(stateOfMonth()).resolves.toBe(ReportingMonthState.LOCKED);
      await expect(service.isDateLocked(companyId, '2026-01-31')).resolves.toBe(
        true,
      );
    });
  });

  describe('reports over a locked month', () => {
    let owner: AuthUser;
    let manager: AuthUser; // leads the team `member` is in
    let member: AuthUser;
    let outsider: string; // on no team
    let toolingProjectId: string;
    let activityId: string;

    const lockedRange = {
      dateFrom: lockedMonth,
      dateTo: lastDayOfMonth(lockedMonth),
    };

    const createUser = async (name: string, role: UserRole) => {
      const email = `${name}-${RUN}@reporting.test`;
      const user = await dataSource.getRepository(User).save({
        companyId,
        role,
        firstName: name,
        lastName: 'Test',
        email,
      });

      return { id: user.id, email, companyId, role };
    };

    const createProject = async (
      projectName: string,
      clientName: string | null,
      activityId: string,
    ) => {
      const project = await dataSource
        .getRepository(Project)
        .save({ companyId, name: `${projectName} ${RUN}`, clientName });

      const projectActivity = await dataSource
        .getRepository(ProjectActivity)
        .save({ companyId, projectId: project.id, activityId });

      return { projectId: project.id, projectActivityId: projectActivity.id };
    };

    const plan = (userId: string, projectId: string, plannedMinutes: number) =>
      dataSource.getRepository(PlanningEntry).save({
        companyId,
        userId,
        projectId,
        date: lockedDate,
        plannedMinutes,
      });

    const log = (
      userId: string,
      projectActivityId: string,
      minutes: number,
      isBillable: boolean,
    ) =>
      dataSource.getRepository(TimeLog).save({
        companyId,
        userId,
        projectActivityId,
        date: lockedDate,
        minutes,
        isBillable,
      });

    const report = (user: AuthUser, groupBy: HoursReportGroupBy) =>
      service.getHoursReport(user, { ...lockedRange, groupBy });

    beforeAll(async () => {
      owner = { id: ownerId, email: '', companyId, role: UserRole.OWNER };
      manager = await createUser('Manager', UserRole.MANAGER);
      member = await createUser('Member', UserRole.EMPLOYEE);
      outsider = (await createUser('Outsider', UserRole.EMPLOYEE)).id;

      const team = await dataSource
        .getRepository(Team)
        .save({ companyId, name: `Team ${RUN}` });

      for (const [userId, roleInTeam] of [
        [manager.id, TeamRole.MANAGER],
        [member.id, TeamRole.MEMBER],
      ] as const) {
        await dataSource.getRepository(TeamMembership).save({
          companyId,
          teamId: team.id,
          userId,
          roleInTeam,
          joinedAt: '2020-01-01',
        });
      }

      const category = await dataSource
        .getRepository(ActCategory)
        .save({ companyId, name: `Engineering ${RUN}` });
      const activity = await dataSource
        .getRepository(Activity)
        .save({ companyId, name: `Backend ${RUN}`, categoryId: category.id });

      activityId = activity.id;
      const crm = await createProject('CRM', 'Acme', activity.id);
      const tooling = await createProject('Tooling', null, activity.id);
      toolingProjectId = tooling.projectId;

      await log(member.id, crm.projectActivityId, 300, true);
      await log(member.id, crm.projectActivityId, 60, false);
      await log(member.id, tooling.projectActivityId, 120, true);
      await log(outsider, crm.projectActivityId, 240, true);

      await plan(member.id, crm.projectId, 480);
      await plan(manager.id, crm.projectId, 60);
    });

    it('splits client work by billability and keeps internal work apart', async () => {
      const { rows, totals } = await report(owner, HoursReportGroupBy.CLIENT);

      expect(rows).toEqual([
        expect.objectContaining({
          name: 'Acme',
          billableMinutes: 540,
          nonBillableMinutes: 60,
          internalMinutes: 0,
          totalMinutes: 600,
        }),
        expect.objectContaining({
          name: null,
          billableMinutes: 0,
          nonBillableMinutes: 0,
          internalMinutes: 120,
          totalMinutes: 120,
        }),
      ]);
      expect(totals.totalMinutes).toBe(720);
    });

    it('groups client names that differ only in case, keeping the capitals', async () => {
      const legacy = await createProject('Legacy', 'acme', activityId);
      const legacyLog = await log(
        member.id,
        legacy.projectActivityId,
        30,
        true,
      );

      const { rows } = await report(owner, HoursReportGroupBy.CLIENT);
      await dataSource.getRepository(TimeLog).delete({ id: legacyLog.id });

      expect(rows.filter((row) => row.name !== null)).toEqual([
        expect.objectContaining({ name: 'Acme', totalMinutes: 630 }),
      ]);
    });

    it('returns the grouping it was built with', async () => {
      await expect(
        report(owner, HoursReportGroupBy.ACTIVITY),
      ).resolves.toMatchObject({ groupBy: HoursReportGroupBy.ACTIVITY });
    });

    it('adds up to the total on every row', async () => {
      for (const groupBy of Object.values(HoursReportGroupBy)) {
        const { rows } = await report(owner, groupBy);

        for (const row of rows) {
          expect(
            row.billableMinutes + row.nonBillableMinutes + row.internalMinutes,
          ).toBe(row.totalMinutes);
        }
      }
    });

    it('names people and projects, with their detail', async () => {
      const people = await report(owner, HoursReportGroupBy.PERSON);
      const projects = await report(owner, HoursReportGroupBy.PROJECT);

      expect(people.rows.map((row) => row.name)).toEqual([
        'Member Test',
        'Outsider Test',
      ]);
      expect(projects.rows.map((row) => [row.name, row.detail])).toEqual([
        [`CRM ${RUN}`, 'Acme'],
        [`Tooling ${RUN}`, null],
      ]);
    });

    it("shows a manager only their team's hours", async () => {
      const { rows, totals } = await report(manager, HoursReportGroupBy.PERSON);

      expect(rows.map((row) => row.id)).toEqual([member.id]);
      expect(totals.totalMinutes).toBe(480);
    });

    it('is final for a locked month and provisional once it touches an open one', async () => {
      await expect(
        report(owner, HoursReportGroupBy.CLIENT),
      ).resolves.toMatchObject({ isProvisional: false });

      await expect(
        service.getHoursReport(owner, {
          dateFrom: lockedMonth,
          dateTo: today,
          groupBy: HoursReportGroupBy.CLIENT,
        }),
      ).resolves.toMatchObject({ isProvisional: true });
    });

    it('refuses a range that runs backwards', async () => {
      await expect(
        service.getHoursReport(owner, {
          dateFrom: today,
          dateTo: lockedMonth,
          groupBy: HoursReportGroupBy.CLIENT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('covers at most 366 days, in hours and in planned vs actual', async () => {
      const fullYear = { dateFrom: '2025-01-01', dateTo: '2026-01-01' };
      const tooLong = { dateFrom: '2025-01-01', dateTo: '2026-01-02' };
      const groupBy = HoursReportGroupBy.CLIENT;

      await expect(
        service.getHoursReport(owner, { ...fullYear, groupBy }),
      ).resolves.toBeDefined();
      await expect(
        service.getHoursReport(owner, { ...tooLong, groupBy }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.getPlannedVsActualReport(owner, fullYear),
      ).resolves.toBeDefined();
      await expect(
        service.getPlannedVsActualReport(owner, tooLong),
      ).rejects.toThrow(BadRequestException);
    });

    describe('planned vs actual', () => {
      const plannedVsActual = (
        user: AuthUser,
        filters: { userId?: string; projectId?: string } = {},
      ) =>
        service.getPlannedVsActualReport(user, { ...lockedRange, ...filters });

      const figures = (
        rows: { name: string; plannedMinutes: number; loggedMinutes: number }[],
      ) => rows.map((row) => [row.name, row.plannedMinutes, row.loggedMinutes]);

      it('shows planned and logged time per person, by name', async () => {
        const { rows, totals, isProvisional } = await plannedVsActual(owner);

        expect(figures(rows)).toEqual([
          ['Manager Test', 60, 0],
          ['Member Test', 480, 480],
          ['Outsider Test', 0, 240],
        ]);
        expect(totals).toEqual({ plannedMinutes: 540, loggedMinutes: 720 });
        expect(isProvisional).toBe(false);
      });

      it("shows a manager only their team's people", async () => {
        const { rows } = await plannedVsActual(manager);

        expect(rows.map((row) => row.name)).toEqual([
          'Manager Test',
          'Member Test',
        ]);
      });

      it('narrows to one project', async () => {
        const { rows } = await plannedVsActual(owner, {
          projectId: toolingProjectId,
        });

        expect(figures(rows)).toEqual([['Member Test', 0, 120]]);
      });

      it('pins an employee to their own figures', async () => {
        const { rows } = await plannedVsActual(member, { userId: outsider });

        expect(rows.map((row) => row.userId)).toEqual([member.id]);
      });

      it('refuses a manager asking about someone outside their teams', async () => {
        await expect(
          plannedVsActual(manager, { userId: outsider }),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });
});
