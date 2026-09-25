import 'reflect-metadata';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { WeekDay } from 'src/companies/enums/week-day.enum';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActivitiesService } from 'src/activities/activities.service';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { ProjectsService } from 'src/projects/projects.service';
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { ReportingPeriodStatus } from 'src/reporting/enums/reporting-period-status.enum';
import { ReportingService } from 'src/reporting/reporting.service';
import { firstDayOfMonth } from 'src/reporting/reporting-months.util';
import { Absence } from 'src/absences/entities/absence.entity';
import { AbsenceType } from 'src/absences/enums/absence-type.enum';
import { UserCapacity } from 'src/capacity/entities/user-capacity.entity';
import { CapacityService } from 'src/capacity/capacity.service';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import {
  toISODate,
  todayISODate,
  weekRange,
} from 'src/capacity/working-days.util';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import {
  freezeAtFirstLockedSecond,
  freezeAtLastGraceSecond,
  timeZoneOnAnotherDay,
} from 'src/lib/testing/time-zones';

import { PlanningEntry } from './entities/planning-entry.entity';
import { PlanningQueryDto } from './dtos/planning-query.dto';
import { PlanningService } from './planning.service';

/**
 * Runs against the development database, so it needs the Docker stack:
 * `make test`. Everything is created under a throwaway company and deleted
 * afterwards.
 */

const RUN = Date.now();
const SLUG = `planning-test-${RUN}`;
const DAY_MS = 24 * 60 * 60 * 1000;

const addDays = (date: string, days: number): string =>
  toISODate(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS);

const stub = <T>(value: unknown): T => value as T;

// The cascade only touches plans from today onwards, so the weeks are relative.
const TODAY = todayISODate();
const MONDAY = weekRange(addDays(TODAY, 21), WeekDay.MONDAY).start;
const TUESDAY = addDays(MONDAY, 1);
const WEDNESDAY = addDays(MONDAY, 2);
const FRIDAY = addDays(MONDAY, 4);
const SATURDAY = addDays(MONDAY, 5);
const NEXT_MONDAY = addDays(MONDAY, 7);
// Seventy days back always lands in a month past its grace window.
const LOCKED_MONDAY = weekRange(addDays(TODAY, -70), WeekDay.MONDAY).start;
const PAST_MONDAY = weekRange(addDays(TODAY, -21), WeekDay.MONDAY).start;

const HOUR = 60;

describe('PlanningService', () => {
  let dataSource: DataSource;
  let service: PlanningService;
  let projects: ProjectsService;
  let expectedHours: ExpectedHoursService;

  let companyId: string;
  let owner: AuthUser;
  let manager: AuthUser; // leads "Alpha"
  let member: AuthUser; // in "Alpha"
  let colleague: AuthUser; // in "Alpha"
  let outsider: AuthUser; // in the company, on no team
  let loneManager: AuthUser; // has the MANAGER role but leads no team

  let projectId: string;
  let otherProjectId: string;
  let archivedProjectId: string;
  let unstaffedProjectId: string;

  const createUser = async (
    name: string,
    role: UserRole,
  ): Promise<AuthUser> => {
    const email = `${name}-${RUN}@planning.test`;
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
    });

    return { id: user.id, email, companyId, role };
  };

  const createProject = async (name: string, status = ProjectStatus.ACTIVE) => {
    const project = await dataSource
      .getRepository(Project)
      .save({ companyId, name: `${name} ${RUN}`, status });

    return project.id;
  };

  const addMembers = async (id: string, users: AuthUser[]) => {
    for (const user of users) {
      await dataSource.query(
        'INSERT INTO project_users (project_id, user_id) VALUES ($1, $2)',
        [id, user.id],
      );
    }
  };

  const plan = (
    userId: string,
    date: string,
    plannedMinutes: number,
    project = projectId,
  ) => ({ userId, projectId: project, date, plannedMinutes });

  /** Written straight to the table, to set up states the service refuses. */
  const existingEntry = async (
    userId: string,
    date: string,
    plannedMinutes: number,
    project = projectId,
  ) => {
    const entry = await dataSource.getRepository(PlanningEntry).save({
      companyId,
      userId,
      projectId: project,
      date,
      plannedMinutes,
    });

    return entry.id;
  };

  const planFullWeek = async (userId: string) => {
    for (let day = 0; day < 5; day++) {
      await existingEntry(userId, addDays(MONDAY, day), 8 * HOUR);
    }
  };

  const absentOn = (userId: string, startDate: string, endDate = startDate) =>
    dataSource.getRepository(Absence).save({
      companyId,
      userId,
      type: AbsenceType.SICK_LEAVE,
      startDate,
      endDate,
    });

  const entriesFor = (userId: string) =>
    dataSource
      .getRepository(PlanningEntry)
      .find({ where: { companyId, userId }, order: { date: 'ASC' } });

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const teamVisibility = new TeamVisibilityService(
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
    );

    const reporting = new ReportingService(
      dataSource.getRepository(ReportingPeriod),
      dataSource.getRepository(Company),
      teamVisibility,
    );

    expectedHours = new ExpectedHoursService(
      dataSource.getRepository(Absence),
      new CapacityService(
        dataSource.getRepository(UserCapacity),
        dataSource.getRepository(Company),
        dataSource.getRepository(User),
        reporting,
      ),
    );

    service = new PlanningService(
      dataSource.getRepository(PlanningEntry),
      dataSource.getRepository(Project),
      dataSource.getRepository(User),
      teamVisibility,
      reporting,
      expectedHours,
      dataSource,
    );

    projects = new ProjectsService(
      dataSource.getRepository(Project),
      dataSource.getRepository(ProjectActivity),
      dataSource.getRepository(User),
      stub<ActivitiesService>({
        findActiveOnlyMany: (ids: string[]) =>
          dataSource.getRepository(Activity).findBy({ id: In(ids) }),
      }),
      new UsersService(
        dataSource.getRepository(User),
        teamVisibility,
        dataSource,
      ),
      teamVisibility,
      service,
      dataSource,
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;

    owner = await createUser('owner', UserRole.OWNER);
    manager = await createUser('manager', UserRole.MANAGER);
    member = await createUser('member', UserRole.EMPLOYEE);
    colleague = await createUser('colleague', UserRole.EMPLOYEE);
    outsider = await createUser('outsider', UserRole.EMPLOYEE);
    loneManager = await createUser('lonemanager', UserRole.MANAGER);

    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Alpha ${RUN}` });

    for (const [user, roleInTeam] of [
      [manager, TeamRole.MANAGER],
      [member, TeamRole.MEMBER],
      [colleague, TeamRole.MEMBER],
    ] as const) {
      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: team.id,
        userId: user.id,
        roleInTeam,
        joinedAt: '2026-01-01',
      });
    }

    projectId = await createProject('Mobile App');
    otherProjectId = await createProject('Website');
    archivedProjectId = await createProject('Legacy');
    unstaffedProjectId = await createProject('Unstaffed');

    await addMembers(projectId, [manager, member, colleague, outsider]);
    await addMembers(otherProjectId, [member]);
    await addMembers(archivedProjectId, [member]);

    // Three weeks ago may already be locked, depending on today's date.
    await dataSource.getRepository(ReportingPeriod).save({
      companyId,
      month: firstDayOfMonth(PAST_MONDAY),
      status: ReportingPeriodStatus.OPEN,
    });
  });

  afterEach(async () => {
    await dataSource.getRepository(PlanningEntry).delete({ companyId });
    await dataSource.getRepository(Absence).delete({ companyId });
    await dataSource
      .getRepository(Project)
      .update({ id: archivedProjectId }, { status: ProjectStatus.ACTIVE });
    await dataSource.getRepository(Company).update(
      { id: companyId },
      {
        standardWorkHoursPerDay: 8,
        weekStartDay: WeekDay.MONDAY,
      },
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.query(
      'DELETE FROM project_users WHERE user_id IN (SELECT id FROM users WHERE company_id = $1)',
      [companyId],
    );
    await dataSource.getRepository(PlanningEntry).delete({ companyId });
    await dataSource.getRepository(Project).delete({ companyId });
    await dataSource.getRepository(Company).delete({ slug: SLUG });
    await dataSource.destroy();
  });

  describe('write scope', () => {
    it('lets a manager plan for people in their team', async () => {
      const entry = await service.create(
        plan(member.id, MONDAY, HOUR),
        manager,
      );

      expect(entry.userId).toBe(member.id);
    });

    it('refuses a manager planning for somebody outside their teams', async () => {
      await expect(
        service.create(plan(outsider.id, MONDAY, HOUR), manager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lets an owner plan for anyone', async () => {
      const entry = await service.create(
        plan(outsider.id, MONDAY, HOUR),
        owner,
      );

      expect(entry.userId).toBe(outsider.id);
    });

    it('refuses an employee every write, even for themselves', async () => {
      const id = await existingEntry(member.id, MONDAY, HOUR);

      await expect(
        service.create(plan(member.id, TUESDAY, HOUR), member),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(id, { plannedMinutes: 2 * HOUR }, member),
      ).rejects.toThrow(ForbiddenException);
      await expect(service.delete(id, member)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('write rules', () => {
    it('refuses somebody who is not a member of the project', async () => {
      await expect(
        service.create(
          plan(member.id, MONDAY, HOUR, unstaffedProjectId),
          manager,
        ),
      ).rejects.toThrow(/not a member of the project/);
    });

    it('refuses moving an entry to a project the person is not on', async () => {
      const id = await existingEntry(colleague.id, MONDAY, HOUR);

      await expect(
        service.update(id, { projectId: otherProjectId }, manager),
      ).rejects.toThrow(/not a member of the project/);
    });

    it('refuses a weekend day', async () => {
      await expect(
        service.create(plan(member.id, SATURDAY, HOUR), manager),
      ).rejects.toThrow(/Monday to Friday/);
    });

    it('refuses a new entry on an archived project', async () => {
      await dataSource
        .getRepository(Project)
        .update({ id: archivedProjectId }, { status: ProjectStatus.ARCHIVED });

      await expect(
        service.create(
          plan(member.id, MONDAY, HOUR, archivedProjectId),
          manager,
        ),
      ).rejects.toThrow(/not available for planning/);
    });

    it('keeps an archived project entry read-only but deletable', async () => {
      const id = await existingEntry(
        member.id,
        MONDAY,
        HOUR,
        archivedProjectId,
      );
      await dataSource
        .getRepository(Project)
        .update({ id: archivedProjectId }, { status: ProjectStatus.ARCHIVED });

      await expect(
        service.update(id, { note: 'Still on it' }, manager),
      ).rejects.toThrow(/archived project and can only be deleted/);

      await service.delete(id, manager);
      expect(await entriesFor(member.id)).toHaveLength(0);
    });

    it('refuses a second entry for the same person, project and day', async () => {
      await existingEntry(member.id, MONDAY, HOUR);

      await expect(
        service.create(plan(member.id, MONDAY, HOUR), manager),
      ).rejects.toThrow(ConflictException);
    });

    it('lets several projects share one day', async () => {
      await existingEntry(member.id, MONDAY, 4 * HOUR);

      await service.create(
        plan(member.id, MONDAY, 4 * HOUR, otherProjectId),
        manager,
      );

      expect(await entriesFor(member.id)).toHaveLength(2);
    });
  });

  describe('locked periods', () => {
    it('refuses creating inside a locked period', async () => {
      await expect(
        service.create(plan(member.id, LOCKED_MONDAY, HOUR), manager),
      ).rejects.toThrow(/LOCKED/);
    });

    it('refuses moving an entry into a locked period', async () => {
      const id = await existingEntry(member.id, MONDAY, HOUR);

      await expect(
        service.update(id, { date: LOCKED_MONDAY }, manager),
      ).rejects.toThrow(/LOCKED/);
    });

    it('refuses changing or deleting an entry inside a locked period', async () => {
      const id = await existingEntry(member.id, LOCKED_MONDAY, HOUR);

      await expect(
        service.update(id, { note: 'Late note' }, manager),
      ).rejects.toThrow(/LOCKED/);
      await expect(service.delete(id, manager)).rejects.toThrow(/LOCKED/);
    });

    it('lets a past plan in an open period be corrected', async () => {
      const id = await existingEntry(member.id, PAST_MONDAY, 8 * HOUR);

      const updated = await service.update(
        id,
        { plannedMinutes: 6 * HOUR },
        manager,
      );

      expect(updated.plannedMinutes).toBe(6 * HOUR);
    });
  });

  describe('daily cap', () => {
    it('allows a full standard day', async () => {
      await service.create(plan(member.id, MONDAY, 8 * HOUR), manager);

      expect(await entriesFor(member.id)).toHaveLength(1);
    });

    it('refuses going past the standard day across projects', async () => {
      await existingEntry(member.id, MONDAY, 6 * HOUR);

      await expect(
        service.create(
          plan(member.id, MONDAY, 2 * HOUR + 15, otherProjectId),
          manager,
        ),
      ).rejects.toThrow('Daily planning limit exceeded: 2h left');
    });

    it('lets a day left over a lowered standard day be reduced', async () => {
      const id = await existingEntry(member.id, MONDAY, 8 * HOUR);
      await dataSource
        .getRepository(Company)
        .update({ id: companyId }, { standardWorkHoursPerDay: 6 });

      const updated = await service.update(
        id,
        { plannedMinutes: 7 * HOUR },
        manager,
      );
      expect(updated.plannedMinutes).toBe(7 * HOUR);

      await expect(
        service.update(id, { plannedMinutes: 7 * HOUR + 30 }, manager),
      ).rejects.toThrow(/Daily planning limit exceeded/);
    });
  });

  describe('weekly budget', () => {
    it('allows a full week of available hours', async () => {
      for (let day = 0; day < 5; day++) {
        await service.create(
          plan(member.id, addDays(MONDAY, day), 8 * HOUR),
          manager,
        );
      }

      expect(await entriesFor(member.id)).toHaveLength(5);
    });

    it('measures the week against available hours, not capacity', async () => {
      await absentOn(member.id, MONDAY);

      for (let day = 1; day < 5; day++) {
        await existingEntry(member.id, addDays(MONDAY, day), 8 * HOUR);
      }

      await expect(
        service.create(plan(member.id, MONDAY, HOUR, otherProjectId), manager),
      ).rejects.toThrow('Weekly planning limit exceeded: 0h left of 32h');
    });

    it('never lets an absence block planning the day itself', async () => {
      await absentOn(member.id, MONDAY);

      const entry = await service.create(
        plan(member.id, MONDAY, 8 * HOUR),
        manager,
      );

      expect(entry.date).toBe(MONDAY);
    });

    it('never changes a plan when an absence is recorded', async () => {
      await planFullWeek(member.id);
      const before = await entriesFor(member.id);

      await absentOn(member.id, MONDAY, TUESDAY);

      expect(await entriesFor(member.id)).toEqual(before);
    });

    it('lets an over-budget week be reduced, but not raised', async () => {
      await planFullWeek(member.id);
      await absentOn(member.id, MONDAY);
      const [monday] = await entriesFor(member.id);

      const lowered = await service.update(
        monday.id,
        { plannedMinutes: 6 * HOUR },
        manager,
      );
      expect(lowered.plannedMinutes).toBe(6 * HOUR);

      const noted = await service.update(
        monday.id,
        { note: 'Covering support' },
        manager,
      );
      expect(noted.note).toBe('Covering support');

      await expect(
        service.update(monday.id, { plannedMinutes: 7 * HOUR }, manager),
      ).rejects.toThrow(/Weekly planning limit exceeded/);
    });

    it('checks the week an entry moves into', async () => {
      await absentOn(member.id, FRIDAY);
      for (const date of [MONDAY, TUESDAY, addDays(MONDAY, 3), FRIDAY]) {
        await existingEntry(member.id, date, 8 * HOUR);
      }
      const id = await existingEntry(
        member.id,
        NEXT_MONDAY,
        4 * HOUR,
        otherProjectId,
      );

      await expect(
        service.update(id, { date: WEDNESDAY }, manager),
      ).rejects.toThrow('Weekly planning limit exceeded: 0h left of 32h');
    });

    it('builds the grid week from the company week start', async () => {
      await dataSource
        .getRepository(Company)
        .update({ id: companyId }, { weekStartDay: WeekDay.SUNDAY });

      const week = await service.getWeek({ date: WEDNESDAY }, manager);

      expect(week.weekStart).toBe(addDays(MONDAY, -1));
      expect(week.weekEnd).toBe(SATURDAY);
    });
  });

  describe('expected hours', () => {
    it('never moves when planning changes', async () => {
      const before = await expectedHours.expectedForUser(
        companyId,
        member.id,
        MONDAY,
        FRIDAY,
      );

      await service.create(plan(member.id, MONDAY, 8 * HOUR), manager);
      await service.create(plan(member.id, TUESDAY, 2 * HOUR), manager);

      expect(
        await expectedHours.expectedForUser(
          companyId,
          member.id,
          MONDAY,
          FRIDAY,
        ),
      ).toEqual(before);
    });
  });

  describe('reading a plan', () => {
    const listFor = (userId: string, by: AuthUser) =>
      service.list(
        Object.assign(new PlanningQueryDto(), {
          userId,
          dateFrom: MONDAY,
          dateTo: FRIDAY,
        }),
        by,
      );

    it('lets an employee read their own plan and nobody else’s', async () => {
      await existingEntry(member.id, MONDAY, HOUR);

      expect((await listFor(member.id, member)).count).toBe(1);
      await expect(listFor(colleague.id, member)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets a manager who leads no team read their own plan', async () => {
      const id = await existingEntry(loneManager.id, MONDAY, HOUR);

      expect((await listFor(loneManager.id, loneManager)).count).toBe(1);
      expect((await service.getById(id, loneManager)).id).toBe(id);
      await expect(listFor(member.id, loneManager)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('week grid', () => {
    it('shows a manager only their own teams', async () => {
      await existingEntry(outsider.id, MONDAY, HOUR);

      const week = await service.getWeek({ date: WEDNESDAY }, manager);
      const ids = week.rows.map((row) => row.user.id).sort();

      expect(ids).toEqual([manager.id, member.id, colleague.id].sort());
    });

    it('gives each row its entries, planned and available minutes', async () => {
      await absentOn(member.id, FRIDAY);
      await existingEntry(member.id, MONDAY, 3 * HOUR);
      await existingEntry(member.id, TUESDAY, 2 * HOUR);

      const week = await service.getWeek({ date: WEDNESDAY }, owner);
      const row = week.rows.find((r) => r.user.id === member.id)!;

      expect(week.weekStart).toBe(MONDAY);
      expect(week.dayLimitMinutes).toBe(8 * HOUR);
      expect(row.entries).toHaveLength(2);
      expect(row.plannedMinutes).toBe(5 * HOUR);
      expect(row.availableMinutes).toBe(32 * HOUR);
    });

    it('offers only the active projects a person is on', async () => {
      await dataSource
        .getRepository(Project)
        .update({ id: archivedProjectId }, { status: ProjectStatus.ARCHIVED });

      const week = await service.getWeek({ date: WEDNESDAY }, owner);
      const row = week.rows.find((r) => r.user.id === member.id)!;

      expect(row.projects.map((p) => p.id).sort()).toEqual(
        [projectId, otherProjectId].sort(),
      );
    });
  });

  describe('membership removal', () => {
    const removeFromProject = async (removed: AuthUser[], by: AuthUser) => {
      const current: Array<{ user_id: string }> = await dataSource.query(
        'SELECT user_id FROM project_users WHERE project_id = $1',
        [projectId],
      );
      const removedIds = new Set(removed.map((user) => user.id));

      await projects.update(
        projectId,
        {
          userIds: current
            .map((row) => row.user_id)
            .filter((id) => !removedIds.has(id)),
        },
        by,
      );
    };

    afterEach(async () => {
      await dataSource.query(
        'DELETE FROM project_users WHERE project_id = $1',
        [projectId],
      );
      await addMembers(projectId, [manager, member, colleague, outsider]);
    });

    it('deletes future plans on that project and keeps the past', async () => {
      await existingEntry(member.id, PAST_MONDAY, 8 * HOUR);
      await existingEntry(member.id, TODAY, HOUR);
      await existingEntry(member.id, MONDAY, 8 * HOUR);
      await existingEntry(member.id, TUESDAY, 4 * HOUR, otherProjectId);
      await existingEntry(colleague.id, MONDAY, 8 * HOUR);

      const { count } = await service.countRemovable(
        { projectIds: [projectId], userIds: [member.id] },
        owner,
      );
      expect(count).toBe(2);

      await removeFromProject([member], owner);

      const left = await entriesFor(member.id);
      expect(left.map((e) => [e.date, e.projectId])).toEqual([
        [PAST_MONDAY, projectId],
        [TUESDAY, otherProjectId],
      ]);
      expect(await entriesFor(colleague.id)).toHaveLength(1);
    });

    it('totals the count across everybody removed', async () => {
      await existingEntry(member.id, MONDAY, 8 * HOUR);
      await existingEntry(colleague.id, MONDAY, 8 * HOUR);
      await existingEntry(colleague.id, TUESDAY, 8 * HOUR);

      const { count } = await service.countRemovable(
        { projectIds: [projectId], userIds: [member.id, colleague.id] },
        owner,
      );

      expect(count).toBe(3);
    });

    it('counts and deletes nothing for people outside a manager’s teams', async () => {
      await existingEntry(outsider.id, MONDAY, 8 * HOUR);

      const { count } = await service.countRemovable(
        { projectIds: [projectId], userIds: [outsider.id] },
        manager,
      );
      expect(count).toBe(0);

      await removeFromProject([outsider], manager);

      expect(await entriesFor(outsider.id)).toHaveLength(1);
    });
  });

  describe("locking on the company's clock", () => {
    const TIME_ZONE = timeZoneOnAnotherDay();
    const MONTH = '2026-01-01';
    const DATE_IN_MONTH = '2026-01-13';

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

    it('accepts a plan on the last day of the grace window', async () => {
      freezeAtLastGraceSecond(MONTH, TIME_ZONE);

      await expect(
        service.create(plan(member.id, DATE_IN_MONTH, HOUR), manager),
      ).resolves.toBeDefined();
    });

    it('refuses a plan from the first locked day', async () => {
      freezeAtFirstLockedSecond(MONTH, TIME_ZONE);

      await expect(
        service.create(plan(member.id, DATE_IN_MONTH, HOUR), manager),
      ).rejects.toThrow(/LOCKED/);
    });
  });
});
