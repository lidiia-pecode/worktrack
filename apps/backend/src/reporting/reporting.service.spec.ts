import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { addDays, todayISODate } from 'src/capacity/working-days.util';
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
import { HoursBilling } from './enums/hours-billing.enum';
import { HoursReportRow, ReportingService } from './reporting.service';
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

    it('records who made the change and when', async () => {
      const reopened = await service.reopenMonth(
        companyId,
        lockedMonthKey,
        ownerId,
      );

      const row = await dataSource
        .getRepository(ReportingPeriod)
        .findOneByOrFail({ companyId, month: lockedMonth });
      expect(row.changedById).toBe(ownerId);
      expect(reopened.changedBy).toBe('Owner Test');
      expect(reopened.changedAt).toBe(row.updatedAt.toISOString());

      const closed = await service.closeMonth(
        companyId,
        lockedMonthKey,
        ownerId,
      );
      expect(closed.changedBy).toBe('Owner Test');
      expect(closed.changedAt! >= reopened.changedAt!).toBe(true);
    });

    it('answers a second Reopen racing the first with the same conflict', async () => {
      // One of the two wins. The other is refused either by the status check,
      // if the first has committed, or by the unique index while both are in
      // flight; both answer the same conflict.
      await expect(
        Promise.all([
          service.reopenMonth(companyId, lockedMonthKey, ownerId),
          service.reopenMonth(companyId, lockedMonthKey, ownerId),
        ]),
      ).rejects.toThrow(ConflictException);

      await expect(service.isDateLocked(companyId, lockedDate)).resolves.toBe(
        false,
      );
    });

    it('waits for a write that passed the lock check before closing', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      let closed = false;
      let closing: Promise<void> = Promise.resolve();

      await dataSource.transaction(async (manager) => {
        // The write's lock check, which share-locks the reopened month's row.
        await expect(
          service.isDateLocked(companyId, lockedDate, manager),
        ).resolves.toBe(false);

        closing = service
          .closeMonth(companyId, lockedMonthKey, ownerId)
          .then(() => {
            closed = true;
          });

        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(closed).toBe(false);
      });

      // The write has committed, so the Close goes through.
      await closing;
      expect(closed).toBe(true);
    });

    it('waits for a capacity change that read the locked range before closing', async () => {
      await service.reopenMonth(companyId, lockedMonthKey, ownerId);

      let closed = false;
      let closing: Promise<void> = Promise.resolve();

      await dataSource.transaction(async (manager) => {
        // The capacity write's check, which share-locks the reopened row too.
        await expect(
          service.latestLockedDate(companyId, manager),
        ).resolves.toBe(lastDayOfMonth(newestLocked));

        closing = service
          .closeMonth(companyId, lockedMonthKey, ownerId)
          .then(() => {
            closed = true;
          });

        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(closed).toBe(false);
      });

      await closing;
      expect(closed).toBe(true);
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
        changedBy: null,
        changedAt: null,
      });
      const reopenedMonth = months.find((m) => m.month === lockedMonthKey);
      expect(reopenedMonth).toMatchObject({
        state: ReportingMonthState.REOPENED,
        editableUntil: null,
        changedBy: 'Owner Test',
      });
      expect(typeof reopenedMonth?.changedAt).toBe('string');
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
    let crmProjectId: string;
    let crmProjectActivityId: string;
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
      crmProjectId = crm.projectId;
      crmProjectActivityId = crm.projectActivityId;

      await log(member.id, crm.projectActivityId, 300, true);
      await log(member.id, crm.projectActivityId, 60, false);
      await log(member.id, tooling.projectActivityId, 120, true);
      await log(outsider, crm.projectActivityId, 240, true);

      await plan(member.id, crm.projectId, 480);
      await plan(manager.id, crm.projectId, 60);
    });

    it('splits by the billable flag on every project, internal ones included', async () => {
      const { rows, totals } = await report(owner, HoursReportGroupBy.PROJECT);

      expect(rows).toEqual([
        expect.objectContaining({
          name: `CRM ${RUN}`,
          billableMinutes: 540,
          nonBillableMinutes: 60,
          totalMinutes: 600,
        }),
        expect.objectContaining({
          name: `Tooling ${RUN}`,
          billableMinutes: 120,
          nonBillableMinutes: 0,
          totalMinutes: 120,
        }),
      ]);
      expect(totals.totalMinutes).toBe(720);
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
          expect(row.billableMinutes + row.nonBillableMinutes).toBe(
            row.totalMinutes,
          );
        }
      }
    });

    it('names people and projects, with their detail', async () => {
      const people = await report(owner, HoursReportGroupBy.PERSON);
      const projects = await report(owner, HoursReportGroupBy.PROJECT);

      // The manager has a plan and no time, so comes last.
      expect(people.rows.map((row) => row.name)).toEqual([
        'Member Test',
        'Outsider Test',
        'Manager Test',
      ]);
      expect(projects.rows.map((row) => [row.name, row.detail])).toEqual([
        [`CRM ${RUN}`, 'Acme'],
        [`Tooling ${RUN}`, null],
      ]);
    });

    it("shows a manager only their team's hours", async () => {
      const { rows, totals } = await report(manager, HoursReportGroupBy.PERSON);

      expect(rows.map((row) => row.id)).toEqual([member.id, manager.id]);
      expect(totals.totalMinutes).toBe(480);
    });

    it('is final for a locked month and provisional once it touches an open one', async () => {
      await expect(
        report(owner, HoursReportGroupBy.PROJECT),
      ).resolves.toMatchObject({ isProvisional: false });

      await expect(
        service.getHoursReport(owner, {
          dateFrom: lockedMonth,
          dateTo: today,
          groupBy: HoursReportGroupBy.PROJECT,
        }),
      ).resolves.toMatchObject({ isProvisional: true });
    });

    it('refuses a range that runs backwards', async () => {
      await expect(
        service.getHoursReport(owner, {
          dateFrom: today,
          dateTo: lockedMonth,
          groupBy: HoursReportGroupBy.PROJECT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('covers at most 366 days', async () => {
      const fullYear = { dateFrom: '2025-01-01', dateTo: '2026-01-01' };
      const tooLong = { dateFrom: '2025-01-01', dateTo: '2026-01-02' };
      const groupBy = HoursReportGroupBy.PROJECT;

      await expect(
        service.getHoursReport(owner, { ...fullYear, groupBy }),
      ).resolves.toBeDefined();
      await expect(
        service.getHoursReport(owner, { ...tooLong, groupBy }),
      ).rejects.toThrow(BadRequestException);
    });

    describe('counting finished days only', () => {
      const yesterday = addDays(today, -1);
      const inThreeDays = addDays(today, 3);
      const rangeReachingToday = {
        dateFrom: yesterday,
        dateTo: addDays(today, 7),
      };

      it('leaves out today and later days, logged and planned alike, and says where it stopped', async () => {
        const logs = await dataSource.getRepository(TimeLog).save(
          [yesterday, today, inThreeDays].map((date, i) => ({
            companyId,
            userId: member.id,
            projectActivityId: crmProjectActivityId,
            date,
            minutes: 30 * (i + 1),
            isBillable: true,
          })),
        );
        const plans = await dataSource.getRepository(PlanningEntry).save(
          [yesterday, today, inThreeDays].map((date) => ({
            companyId,
            userId: member.id,
            projectId: crmProjectId,
            date,
            plannedMinutes: 120,
          })),
        );

        const hours = await service.getHoursReport(owner, {
          ...rangeReachingToday,
          groupBy: HoursReportGroupBy.PERSON,
        });
        await dataSource.getRepository(TimeLog).remove(logs);
        await dataSource.getRepository(PlanningEntry).remove(plans);

        expect(hours.rows).toEqual([
          expect.objectContaining({
            id: member.id,
            totalMinutes: 30,
            plannedMinutes: 120,
          }),
        ]);
        expect(hours.countedUntil).toBe(yesterday);
      });

      it('counts nothing in a range that starts today', async () => {
        const { rows, countedUntil } = await service.getHoursReport(owner, {
          dateFrom: today,
          dateTo: inThreeDays,
          groupBy: HoursReportGroupBy.PERSON,
        });

        expect(rows).toEqual([]);
        expect(countedUntil).toBe(yesterday);
      });

      it('counts the whole of a range that has finished', async () => {
        const hours = await report(owner, HoursReportGroupBy.PROJECT);

        expect(hours).toMatchObject({ countedUntil: null });
        expect(hours.totals.totalMinutes).toBe(720);
      });
    });

    it('keeps rows with equal figures in the same order: by name, then id', async () => {
      const twins = await dataSource.getRepository(User).save(
        ['first', 'second'].map((which) => ({
          companyId,
          role: UserRole.EMPLOYEE,
          firstName: 'Twin',
          lastName: 'Test',
          email: `twin-${which}-${RUN}@reporting.test`,
        })),
      );
      const twinLogs = await Promise.all(
        twins.map((twin) => log(twin.id, crmProjectActivityId, 240, true)),
      );
      const twinIds = twins.map((twin) => twin.id).sort();

      const hours = await report(owner, HoursReportGroupBy.PERSON);
      await dataSource.getRepository(TimeLog).remove(twinLogs);

      expect(hours.rows.map((row) => row.id)).toEqual([
        member.id,
        outsider,
        ...twinIds,
        manager.id,
      ]);
    });

    describe('planned beside the hours', () => {
      it('sums the plan by project, with the totals', async () => {
        const { rows, totals } = await report(
          owner,
          HoursReportGroupBy.PROJECT,
        );

        expect(rows.map((row) => [row.name, row.plannedMinutes])).toEqual([
          [`CRM ${RUN}`, 540],
          [`Tooling ${RUN}`, 0],
        ]);
        expect(totals.plannedMinutes).toBe(540);
      });

      it('lists somebody with a plan and no time last, with nothing logged', async () => {
        const { rows } = await report(owner, HoursReportGroupBy.PERSON);

        expect(rows.at(-1)).toMatchObject({
          id: manager.id,
          totalMinutes: 0,
          plannedMinutes: 60,
        });
        expect(rows.find((row) => row.id === member.id)?.plannedMinutes).toBe(
          480,
        );
      });

      it('lists a project that was planned and never logged', async () => {
        const roadmap = await createProject('Roadmap', 'Acme', activityId);
        const roadmapPlan = await plan(member.id, roadmap.projectId, 120);

        const { rows } = await report(owner, HoursReportGroupBy.PROJECT);
        await dataSource.getRepository(PlanningEntry).remove(roadmapPlan);

        expect(rows.at(-1)).toMatchObject({
          name: `Roadmap ${RUN}`,
          detail: 'Acme',
          totalMinutes: 0,
          plannedMinutes: 120,
        });
      });

      it('counts only the plans of the people a manager sees', async () => {
        const outsiderPlan = await plan(outsider, crmProjectId, 100);

        const forOwner = await report(owner, HoursReportGroupBy.PROJECT);
        const forManager = await report(manager, HoursReportGroupBy.PROJECT);
        await dataSource.getRepository(PlanningEntry).remove(outsiderPlan);

        expect(forOwner.totals.plannedMinutes).toBe(640);
        expect(forManager.totals.plannedMinutes).toBe(540);
      });

      it("leaves out a deactivated person's plan unless they logged time", async () => {
        const leaver = await createUser('Leaver', UserRole.EMPLOYEE);
        await dataSource
          .getRepository(User)
          .update(leaver.id, { status: UserStatus.DEACTIVATED });
        const leftoverPlan = await plan(leaver.id, crmProjectId, 100);

        const { rows, totals } = await report(
          owner,
          HoursReportGroupBy.PROJECT,
        );
        await dataSource.getRepository(PlanningEntry).remove(leftoverPlan);
        await dataSource.getRepository(User).delete(leaver.id);

        expect(rows[0].plannedMinutes).toBe(540);
        expect(totals.plannedMinutes).toBe(540);
      });

      it('has no plan by activity, which plans are not made for', async () => {
        const { rows, totals } = await report(
          owner,
          HoursReportGroupBy.ACTIVITY,
        );

        expect(rows.every((row) => row.plannedMinutes === null)).toBe(true);
        expect(totals.plannedMinutes).toBeNull();
      });
    });

    describe("opening a project's people", () => {
      const people = (
        user: AuthUser,
        filter: {
          projectId?: string;
        },
      ) =>
        service.getHoursReport(user, {
          ...lockedRange,
          groupBy: HoursReportGroupBy.PERSON,
          ...filter,
        });

      const figures = (rows: HoursReportRow[]) =>
        rows.map((row) => [row.name, row.totalMinutes, row.plannedMinutes]);

      it("lists a project's people with their time and plans on it", async () => {
        const { rows, totals } = await people(owner, {
          projectId: crmProjectId,
        });

        expect(figures(rows)).toEqual([
          ['Member Test', 360, 480],
          ['Outsider Test', 240, 0],
          ['Manager Test', 0, 60],
        ]);
        expect(totals).toMatchObject({
          totalMinutes: 600,
          plannedMinutes: 540,
        });
      });

      it('shows a manager only their team on the project', async () => {
        const { rows } = await people(manager, { projectId: crmProjectId });

        expect(rows.map((row) => row.id)).toEqual([member.id, manager.id]);
      });
    });

    describe('hours export', () => {
      const exportRows = (user: AuthUser) =>
        service.getHoursExport(user, lockedRange);

      it('has one row per person, day, project, activity and billing', async () => {
        const rows = await exportRows(owner);

        expect(
          rows.map((row) => [
            row.person,
            row.project,
            row.billing,
            row.minutes,
          ]),
        ).toEqual([
          ['Member Test', `CRM ${RUN}`, HoursBilling.BILLABLE, 300],
          ['Member Test', `CRM ${RUN}`, HoursBilling.NON_BILLABLE, 60],
          ['Member Test', `Tooling ${RUN}`, HoursBilling.BILLABLE, 120],
          ['Outsider Test', `CRM ${RUN}`, HoursBilling.BILLABLE, 240],
        ]);
        expect(rows[0]).toMatchObject({
          date: lockedDate,
          client: 'Acme',
          activity: `Backend ${RUN}`,
          category: `Engineering ${RUN}`,
        });
        expect(rows[2].client).toBeNull();
      });

      it('adds up to the Hours report for the same people', async () => {
        for (const user of [owner, manager]) {
          const rows = await exportRows(user);
          const { totals } = await report(user, HoursReportGroupBy.PROJECT);

          expect(rows.reduce((sum, row) => sum + row.minutes, 0)).toBe(
            totals.totalMinutes,
          );
        }
      });

      it("shows a manager only their team's hours", async () => {
        const rows = await exportRows(manager);

        expect(new Set(rows.map((row) => row.person))).toEqual(
          new Set(['Member Test']),
        );
      });

      it('spells a client the same way on every row', async () => {
        const legacy = await createProject('Old CRM', 'acme', activityId);
        const legacyLog = await log(
          member.id,
          legacy.projectActivityId,
          30,
          true,
        );

        const rows = await exportRows(owner);
        await dataSource.getRepository(TimeLog).delete({ id: legacyLog.id });

        expect(rows.filter((row) => row.project === `Old CRM ${RUN}`)).toEqual([
          expect.objectContaining({ client: 'Acme' }),
        ]);
      });

      it('marks each row closed or open by its month', async () => {
        const yesterday = addDays(today, -1);
        const openLog = await dataSource.getRepository(TimeLog).save({
          companyId,
          userId: member.id,
          projectActivityId: crmProjectActivityId,
          date: yesterday,
          minutes: 45,
          isBillable: true,
        });

        const rows = await service.getHoursExport(owner, {
          dateFrom: lockedMonth,
          dateTo: today,
        });
        await dataSource.getRepository(TimeLog).delete({ id: openLog.id });

        expect(
          rows
            .filter((row) => row.date === lockedDate)
            .map((row) => row.isPeriodClosed),
        ).not.toContain(false);
        expect(rows.find((row) => row.date === yesterday)).toMatchObject({
          minutes: 45,
          isPeriodClosed: false,
        });
      });

      it('counts the same finished days as the Hours report', async () => {
        const todayLog = await dataSource.getRepository(TimeLog).save({
          companyId,
          userId: member.id,
          projectActivityId: crmProjectActivityId,
          date: today,
          minutes: 45,
          isBillable: true,
        });

        const rows = await service.getHoursExport(owner, {
          dateFrom: lockedMonth,
          dateTo: today,
        });
        const { totals } = await service.getHoursReport(owner, {
          dateFrom: lockedMonth,
          dateTo: today,
          groupBy: HoursReportGroupBy.PROJECT,
        });
        await dataSource.getRepository(TimeLog).delete({ id: todayLog.id });

        expect(rows.find((row) => row.date === today)).toBeUndefined();
        expect(rows.reduce((sum, row) => sum + row.minutes, 0)).toBe(
          totals.totalMinutes,
        );
      });

      it('refuses a range that runs backwards or is too long', async () => {
        await expect(
          service.getHoursExport(owner, {
            dateFrom: today,
            dateTo: lockedMonth,
          }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.getHoursExport(owner, {
            dateFrom: '2025-01-01',
            dateTo: '2026-01-02',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe("a person's projects", () => {
      const projectsOf = (user: AuthUser, userId: string) =>
        service.getHoursReport(user, {
          ...lockedRange,
          groupBy: HoursReportGroupBy.PROJECT,
          userId,
        });

      it("lists one person's time and plans by project", async () => {
        const { rows, totals } = await projectsOf(owner, member.id);

        expect(
          rows.map((row) => [row.name, row.totalMinutes, row.plannedMinutes]),
        ).toEqual([
          [`CRM ${RUN}`, 360, 480],
          [`Tooling ${RUN}`, 120, 0],
        ]);
        expect(totals).toMatchObject({ totalMinutes: 480 });
      });

      it('shows a manager nothing of somebody outside their teams', async () => {
        const { rows } = await projectsOf(manager, outsider);

        expect(rows).toEqual([]);
      });
    });
  });
});
