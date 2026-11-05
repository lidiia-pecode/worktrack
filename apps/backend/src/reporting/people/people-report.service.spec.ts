import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserInactivePeriod } from 'src/users/entities/user-inactive-period.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import { Absence } from 'src/absences/entities/absence.entity';
import { AbsenceType } from 'src/absences/enums/absence-type.enum';
import { UserCapacity } from 'src/capacity/entities/user-capacity.entity';
import { CapacityService } from 'src/capacity/capacity.service';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import { addDays } from 'src/capacity/working-days.util';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { LONG_STANDING_ACCOUNT_CREATED_AT } from 'src/lib/testing/accounts';

import { ReportingPeriod } from '../entities/reporting-period.entity';
import { ReportingService } from '../reporting.service';
import { HoursReportGroupBy } from '../enums/hours-report-group-by.enum';
import { PeopleReportService, TimelineBucket } from './people-report.service';

/**
 * Runs against the development database, so it needs the Docker stack.
 * March 2026 has 22 working days and is long past its grace window.
 */

const RUN = Date.now();
const SLUG = `people-report-test-${RUN}`;

const MARCH = { dateFrom: '2026-03-01', dateTo: '2026-03-31' };
/** One day past the weekly timeline's 92, so it reads month by month. */
const THIRTEEN_WEEKS_AND_A_DAY = {
  dateFrom: '2026-01-10',
  dateTo: '2026-04-12',
};
const WORKING_DAYS_IN_MARCH = 22;
const FULL_DAY = 8 * 60;
const PART_TIME_WEEK = 24 * 60;

describe('PeopleReportService', () => {
  let dataSource: DataSource;
  let service: PeopleReportService;

  let companyId: string;
  let owner: AuthUser;
  let manager: AuthUser; // leads the team `member` and `awayAllMonth` are in
  let member: string; // full-time, two days off, logs and is planned
  let awayAllMonth: string; // absent for the whole of March
  let partTimer: string; // on no team, 24 hours a week, logs nothing
  let projectId: string;
  let projectActivityId: string;
  let teamId: string;
  let expectedHours: ExpectedHoursService;
  let reporting: ReportingService;

  const createUser = async (name: string, role: UserRole) => {
    const email = `${name}-${RUN}@people-report.test`;
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
      createdAt: LONG_STANDING_ACCOUNT_CREATED_AT,
    });

    return { id: user.id, email, companyId, role };
  };

  const rowFor = async (viewer: AuthUser, userId: string) => {
    const { rows } = await service.getPeopleReport(viewer, MARCH);
    return rows.find((row) => row.userId === userId);
  };

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const teamVisibility = new TeamVisibilityService(
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
    );
    reporting = new ReportingService(
      dataSource.getRepository(ReportingPeriod),
      dataSource.getRepository(Company),
      teamVisibility,
    );
    const capacity = new CapacityService(
      dataSource.getRepository(UserCapacity),
      dataSource.getRepository(Company),
      dataSource.getRepository(User),
      dataSource.getRepository(UserInactivePeriod),
      reporting,
    );
    expectedHours = new ExpectedHoursService(
      dataSource.getRepository(Absence),
      capacity,
    );
    service = new PeopleReportService(
      dataSource.getRepository(TimeLog),
      dataSource.getRepository(Company),
      dataSource.getRepository(TeamMembership),
      reporting,
      expectedHours,
      teamVisibility,
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG, timezone: 'UTC' });
    companyId = company.id;

    owner = await createUser('Owner', UserRole.OWNER);
    manager = await createUser('Manager', UserRole.MANAGER);
    member = (await createUser('Member', UserRole.EMPLOYEE)).id;
    awayAllMonth = (await createUser('Away', UserRole.EMPLOYEE)).id;
    partTimer = (await createUser('Parttimer', UserRole.EMPLOYEE)).id;

    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Team ${RUN}` });
    teamId = team.id;

    for (const [userId, roleInTeam] of [
      [manager.id, TeamRole.MANAGER],
      [member, TeamRole.MEMBER],
      [awayAllMonth, TeamRole.MEMBER],
    ] as const) {
      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: team.id,
        userId,
        roleInTeam,
        joinedAt: '2020-01-01',
      });
    }

    await dataSource.getRepository(UserCapacity).save({
      companyId,
      userId: partTimer,
      validFrom: '2020-01-01',
      minutesPerWeek: PART_TIME_WEEK,
    });

    await dataSource.getRepository(Absence).save([
      {
        companyId,
        userId: member,
        type: AbsenceType.VACATION,
        startDate: '2026-03-09',
        endDate: '2026-03-10',
      },
      {
        companyId,
        userId: awayAllMonth,
        type: AbsenceType.SICK_LEAVE,
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      },
    ]);

    const category = await dataSource
      .getRepository(ActCategory)
      .save({ companyId, name: `Development ${RUN}` });
    const activity = await dataSource
      .getRepository(Activity)
      .save({ companyId, name: `Backend ${RUN}`, categoryId: category.id });
    const project = await dataSource
      .getRepository(Project)
      .save({ companyId, name: `CRM ${RUN}`, clientName: 'Acme' });
    const projectActivity = await dataSource
      .getRepository(ProjectActivity)
      .save({ companyId, projectId: project.id, activityId: activity.id });
    projectId = project.id;
    projectActivityId = projectActivity.id;

    await dataSource.getRepository(TimeLog).save(
      [
        { minutes: 960, isBillable: true },
        { minutes: 240, isBillable: false },
      ].map((log) => ({
        ...log,
        companyId,
        userId: member,
        projectActivityId: projectActivity.id,
        date: '2026-03-16',
      })),
    );
    await dataSource.getRepository(PlanningEntry).save({
      companyId,
      userId: member,
      projectId: project.id,
      date: '2026-03-17',
      plannedMinutes: 600,
    });
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });
    await dataSource.destroy();
  });

  it("puts each person's logged and planned time beside what was expected", async () => {
    expect(await rowFor(owner, member)).toMatchObject({
      loggedMinutes: 1200,
      billableMinutes: 960,
      nonBillableMinutes: 240,
      plannedMinutes: 600,
      expectedMinutes: (WORKING_DAYS_IN_MARCH - 2) * FULL_DAY,
      timeOffDays: 2,
    });
  });

  it('expects nothing of somebody away all month, and counts their days off', async () => {
    expect(await rowFor(owner, awayAllMonth)).toMatchObject({
      loggedMinutes: 0,
      expectedMinutes: 0,
      timeOffDays: WORKING_DAYS_IN_MARCH,
    });
  });

  it('expects a part-timer to work their own capacity', async () => {
    expect(await rowFor(owner, partTimer)).toMatchObject({
      expectedMinutes: (WORKING_DAYS_IN_MARCH * PART_TIME_WEEK) / 5,
      timeOffDays: 0,
    });
  });

  it('adds every row up into the totals', async () => {
    const { rows, totals } = await service.getPeopleReport(owner, MARCH);

    expect(totals.loggedMinutes).toBe(1200);
    expect(totals.plannedMinutes).toBe(600);
    expect(totals.expectedMinutes).toBe(
      rows.reduce((sum, row) => sum + row.expectedMinutes, 0),
    );
    expect(totals.timeOffDays).toBe(2 + WORKING_DAYS_IN_MARCH);
  });

  it("shows a manager only their team's people, themselves included", async () => {
    const { rows } = await service.getPeopleReport(manager, MARCH);

    expect(new Set(rows.map((row) => row.userId))).toEqual(
      new Set([manager.id, member, awayAllMonth]),
    );
  });

  it('shows an employee their own row alone, without naming teams', async () => {
    const employee = {
      id: member,
      email: '',
      companyId,
      role: UserRole.EMPLOYEE,
    };
    const { rows, totals } = await service.getPeopleReport(employee, MARCH);

    expect(rows).toEqual([
      expect.objectContaining({
        userId: member,
        loggedMinutes: 1200,
        teams: [],
      }),
    ]);
    expect(totals.loggedMinutes).toBe(1200);
  });

  describe('days without time', () => {
    it('lists the working days somebody logged nothing on, leaving out days off and weekends', async () => {
      const row = await rowFor(owner, member);

      // 22 working days, two off (9 and 10 March), time on the 16th.
      expect(row?.daysWithoutTime).toHaveLength(WORKING_DAYS_IN_MARCH - 3);
      expect(row?.daysWithoutTime[0]).toBe('2026-03-02');
      expect(row?.daysWithoutTime).not.toContain('2026-03-07');
      expect(row?.daysWithoutTime).not.toContain('2026-03-09');
      expect(row?.daysWithoutTime).not.toContain('2026-03-16');
    });

    it('expects no day of somebody away all month', async () => {
      expect((await rowFor(owner, awayAllMonth))?.daysWithoutTime).toEqual([]);
    });

    it('starts on the day somebody joined', async () => {
      const joiner = await dataSource.getRepository(User).save({
        companyId,
        role: UserRole.EMPLOYEE,
        firstName: 'Joiner',
        lastName: 'Test',
        email: `joiner-${RUN}@people-report.test`,
        createdAt: new Date('2026-03-25T09:00:00Z'),
      });

      const row = await rowFor(owner, joiner.id);
      await dataSource.getRepository(User).delete({ id: joiner.id });

      expect(row?.daysWithoutTime).toEqual([
        '2026-03-25',
        '2026-03-26',
        '2026-03-27',
        '2026-03-30',
        '2026-03-31',
      ]);
    });

    it('never counts today or later', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const { rows } = await service.getPeopleReport(owner, {
        dateFrom: today,
        dateTo: nextWeek,
      });

      expect(rows.every((row) => row.daysWithoutTime.length === 0)).toBe(true);
    });

    it('gives a manager the days of the people they see', async () => {
      const { rows } = await service.getPeopleReport(manager, MARCH);

      expect(
        rows.find((row) => row.userId === manager.id)?.daysWithoutTime,
      ).toHaveLength(WORKING_DAYS_IN_MARCH);
    });
  });

  it('lists a deactivated person only with logged time, expected up to their last working day, and never with missing days', async () => {
    const leaver = await createUser('Leaver', UserRole.EMPLOYEE);
    const plannedOnly = await createUser('Plannedonly', UserRole.EMPLOYEE);
    await dataSource
      .getRepository(User)
      .update([leaver.id, plannedOnly.id], { status: UserStatus.DEACTIVATED });
    // Last working day Monday 9 March: six working days up to it.
    await dataSource.getRepository(User).update(leaver.id, {
      lastWorkingDay: '2026-03-09',
    });
    await dataSource.getRepository(TimeLog).save({
      companyId,
      userId: leaver.id,
      projectActivityId,
      date: '2026-03-03',
      minutes: 120,
      isBillable: false,
    });
    await dataSource.getRepository(PlanningEntry).save({
      companyId,
      userId: plannedOnly.id,
      projectId,
      date: '2026-03-04',
      plannedMinutes: 240,
    });

    const {
      people: { rows, totals },
      timeline: { buckets },
    } = await service.getOverview(owner, MARCH);
    await dataSource.getRepository(User).delete([leaver.id, plannedOnly.id]);

    expect(rows.find((row) => row.userId === leaver.id)).toMatchObject({
      status: UserStatus.DEACTIVATED,
      loggedMinutes: 120,
      expectedMinutes: 6 * FULL_DAY,
      daysWithoutTime: [],
    });
    expect(rows.some((row) => row.userId === plannedOnly.id)).toBe(false);
    expect(
      buckets.reduce((sum, bucket) => sum + bucket.plannedMinutes, 0),
    ).toBe(totals.plannedMinutes);
  });

  it('expects nothing, and finds no missing days, while somebody was deactivated and has since come back', async () => {
    const returner = await createUser('Returner', UserRole.EMPLOYEE);
    // Away from Tuesday 10 March and back on Monday 16 March: four working days.
    await dataSource.getRepository(UserInactivePeriod).save({
      companyId,
      userId: returner.id,
      deactivatedAt: new Date('2026-03-09T17:00:00Z'),
      reactivatedAt: new Date('2026-03-16T09:00:00Z'),
      lastWorkingDay: '2026-03-09',
      firstDayBack: '2026-03-16',
    });
    await dataSource.getRepository(TimeLog).save({
      companyId,
      userId: returner.id,
      projectActivityId,
      date: '2026-03-03',
      minutes: 60,
      isBillable: false,
    });

    const row = await rowFor(owner, returner.id);
    await dataSource.getRepository(User).delete(returner.id);

    expect(row?.expectedMinutes).toBe((WORKING_DAYS_IN_MARCH - 4) * FULL_DAY);
    expect(row?.daysWithoutTime).toHaveLength(WORKING_DAYS_IN_MARCH - 5);
    expect(row?.daysWithoutTime).toContain('2026-03-09');
    expect(row?.daysWithoutTime).not.toContain('2026-03-10');
    expect(row?.daysWithoutTime).not.toContain('2026-03-13');
    expect(row?.daysWithoutTime).toContain('2026-03-16');
  });

  describe('teams', () => {
    it("names each person's teams, an archived one marked for the owner", async () => {
      const [design, archived] = await dataSource.getRepository(Team).save([
        { companyId, name: `Design ${RUN}` },
        { companyId, name: `Archived ${RUN}`, status: TeamStatus.ARCHIVED },
      ]);
      await dataSource.getRepository(TeamMembership).save(
        [design, archived].map((team) => ({
          companyId,
          teamId: team.id,
          userId: member,
          roleInTeam: TeamRole.MEMBER,
          joinedAt: '2020-01-01',
        })),
      );

      const forOwner = await rowFor(owner, member);
      const forManager = await rowFor(manager, member);
      const nobody = await rowFor(owner, partTimer);
      await dataSource.getRepository(Team).delete([design.id, archived.id]);

      const named = (row: typeof forOwner) =>
        row?.teams.map(({ id, name, isArchived }) => ({
          id,
          name,
          isArchived,
        }));
      expect(named(forOwner)).toEqual([
        { id: archived.id, name: `Archived ${RUN}`, isArchived: true },
        { id: design.id, name: `Design ${RUN}`, isArchived: false },
        { id: teamId, name: `Team ${RUN}`, isArchived: false },
      ]);
      // The manager leads only one of them, so the others aren't named.
      expect(named(forManager)).toEqual([
        { id: teamId, name: `Team ${RUN}`, isArchived: false },
      ]);
      expect(nobody?.teams).toEqual([]);
    });
  });

  describe('the owner', () => {
    it('is listed only with logged time, with its own days without time', async () => {
      const before = await rowFor(owner, owner.id);
      const log = await dataSource.getRepository(TimeLog).save({
        companyId,
        userId: owner.id,
        projectActivityId,
        date: '2026-03-05',
        minutes: 60,
        isBillable: false,
      });

      const after = await rowFor(owner, owner.id);
      const {
        people: { totals },
        timeline: { buckets },
      } = await service.getOverview(owner, MARCH);
      await dataSource.getRepository(TimeLog).remove(log);

      expect(before).toBeUndefined();
      expect(after).toMatchObject({
        loggedMinutes: 60,
        role: UserRole.OWNER,
      });
      expect(after?.daysWithoutTime).toHaveLength(WORKING_DAYS_IN_MARCH - 1);
      expect(after?.daysWithoutTime).not.toContain('2026-03-05');
      expect(
        buckets.reduce((sum, bucket) => sum + bucket.expectedMinutes, 0),
      ).toBe(totals.expectedMinutes);
    });

    it('is listed with a plan too, so the planned total matches the projects', async () => {
      const plan = await dataSource.getRepository(PlanningEntry).save({
        companyId,
        userId: owner.id,
        projectId,
        date: '2026-03-12',
        plannedMinutes: 300,
      });

      const row = await rowFor(owner, owner.id);
      const { totals } = await service.getPeopleReport(owner, MARCH);
      const projects = await reporting.getHoursReport(owner, {
        ...MARCH,
        groupBy: HoursReportGroupBy.PROJECT,
      });
      await dataSource.getRepository(PlanningEntry).remove(plan);

      expect(row).toMatchObject({ loggedMinutes: 0, plannedMinutes: 300 });
      expect(row?.daysWithoutTime).toHaveLength(WORKING_DAYS_IN_MARCH);
      expect(totals.plannedMinutes).toBe(projects.totals.plannedMinutes);
    });
  });

  it('counts expected only to the day the Hours report counted to', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const walk = jest.spyOn(expectedHours, 'availabilityToDateFor');

    await service.getPeopleReport(owner, {
      dateFrom: addDays(today, -10),
      dateTo: addDays(today, 10),
    });

    expect(walk).toHaveBeenCalledWith(
      companyId,
      expect.any(Array),
      addDays(today, -10),
      addDays(today, -1),
      expect.any(Map),
    );
    walk.mockRestore();
  });

  it('is final for a locked month, counted in full', async () => {
    await expect(service.getPeopleReport(owner, MARCH)).resolves.toMatchObject({
      isProvisional: false,
      countedUntil: null,
    });
  });

  describe('the timeline', () => {
    const sums = (buckets: TimelineBucket[]) =>
      buckets.reduce(
        (sum, bucket) => ({
          loggedMinutes: sum.loggedMinutes + bucket.loggedMinutes,
          billableMinutes: sum.billableMinutes + bucket.billableMinutes,
          plannedMinutes: sum.plannedMinutes + bucket.plannedMinutes,
          expectedMinutes: sum.expectedMinutes + bucket.expectedMinutes,
        }),
        {
          loggedMinutes: 0,
          billableMinutes: 0,
          plannedMinutes: 0,
          expectedMinutes: 0,
        },
      );

    const timelineOf = async (viewer: AuthUser, range: typeof MARCH) =>
      (await service.getOverview(viewer, range)).timeline;

    it('shows a month week by week, from Monday, with partial weeks at both ends', async () => {
      const { bucketSize, buckets } = await timelineOf(owner, MARCH);

      expect(bucketSize).toBe('week');
      expect(
        buckets.map((bucket) => [bucket.start, bucket.end, bucket.isPartial]),
      ).toEqual([
        ['2026-03-01', '2026-03-01', true],
        ['2026-03-02', '2026-03-08', false],
        ['2026-03-09', '2026-03-15', false],
        ['2026-03-16', '2026-03-22', false],
        ['2026-03-23', '2026-03-29', false],
        ['2026-03-30', '2026-03-31', true],
      ]);
      expect(buckets.map((bucket) => bucket.workingDays)).toEqual([
        0, 5, 5, 5, 5, 2,
      ]);
      expect(buckets[3]).toMatchObject({
        loggedMinutes: 1200,
        billableMinutes: 960,
        plannedMinutes: 600,
      });
    });

    it('adds up to its People report, which matches the one asked for alone', async () => {
      for (const viewer of [owner, manager]) {
        for (const range of [MARCH, THIRTEEN_WEEKS_AND_A_DAY]) {
          const { people, timeline } = await service.getOverview(viewer, range);

          expect(sums(timeline.buckets)).toEqual({
            loggedMinutes: people.totals.loggedMinutes,
            billableMinutes: people.totals.billableMinutes,
            plannedMinutes: people.totals.plannedMinutes,
            expectedMinutes: people.totals.expectedMinutes,
          });
          expect(people).toEqual(await service.getPeopleReport(viewer, range));
        }
      }
    });

    it('shows up to 92 days week by week', async () => {
      const { bucketSize, buckets } = await timelineOf(owner, {
        dateFrom: '2026-01-10',
        dateTo: '2026-04-11',
      });

      expect(bucketSize).toBe('week');
      expect(
        buckets.every((bucket) => bucket.end <= addDays(bucket.start, 6)),
      ).toBe(true);
    });

    it('shows 93 days and more month by month, cut to the range', async () => {
      const { bucketSize, buckets } = await timelineOf(
        owner,
        THIRTEEN_WEEKS_AND_A_DAY,
      );

      expect(bucketSize).toBe('month');
      expect(
        buckets.map((bucket) => [bucket.start, bucket.end, bucket.isPartial]),
      ).toEqual([
        ['2026-01-10', '2026-01-31', true],
        ['2026-02-01', '2026-02-28', false],
        ['2026-03-01', '2026-03-31', false],
        ['2026-04-01', '2026-04-12', true],
      ]);
      expect(buckets[2]).toMatchObject({
        workingDays: WORKING_DAYS_IN_MARCH,
        loggedMinutes: 1200,
        plannedMinutes: 600,
      });
    });

    it('stops at yesterday, and has nothing for a range that starts today', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = addDays(today, -1);

      const running = await timelineOf(owner, {
        dateFrom: addDays(today, -10),
        dateTo: addDays(today, 10),
      });
      const ahead = await timelineOf(owner, {
        dateFrom: today,
        dateTo: addDays(today, 7),
      });

      expect(running.buckets.at(-1)?.end).toBe(yesterday);
      expect(running.countedUntil).toBe(yesterday);
      expect(ahead.buckets).toEqual([]);
    });
  });

  describe('one team', () => {
    let otherTeamId: string; // partTimer alone, led by nobody here

    beforeAll(async () => {
      const otherTeam = await dataSource
        .getRepository(Team)
        .save({ companyId, name: `Other team ${RUN}` });
      otherTeamId = otherTeam.id;

      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: otherTeamId,
        userId: partTimer,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: '2020-01-01',
      });
    });

    const exportRows = (viewer: AuthUser, team?: string) =>
      reporting.getHoursExport(viewer, { ...MARCH, teamId: team });

    it("narrows an owner's report, its timeline and the export to the team's members", async () => {
      const { people, timeline } = await service.getOverview(owner, {
        ...MARCH,
        teamId,
      });
      const hours = await reporting.getHoursReport(owner, {
        ...MARCH,
        teamId: otherTeamId,
        groupBy: HoursReportGroupBy.PERSON,
      });

      expect(people.rows.map((row) => row.userId).sort()).toEqual(
        [manager.id, member, awayAllMonth].sort(),
      );
      expect(timeline.buckets[3].loggedMinutes).toBe(1200);
      expect(hours.rows).toEqual([]);
      expect(await exportRows(owner, teamId)).toHaveLength(2);
      expect(await exportRows(owner, otherTeamId)).toEqual([]);
    });

    it("gives a manager nothing for a team they don't lead", async () => {
      const { people, timeline } = await service.getOverview(manager, {
        ...MARCH,
        teamId: otherTeamId,
      });
      const hours = await reporting.getHoursReport(manager, {
        ...MARCH,
        teamId: otherTeamId,
        groupBy: HoursReportGroupBy.PROJECT,
      });

      expect(people.rows).toEqual([]);
      expect(
        timeline.buckets.every((bucket) => bucket.loggedMinutes === 0),
      ).toBe(true);
      expect(hours.rows).toEqual([]);
      expect(await exportRows(manager, otherTeamId)).toEqual([]);
    });
  });

  it('covers at most 366 days', async () => {
    await expect(
      service.getPeopleReport(owner, {
        dateFrom: '2025-01-01',
        dateTo: '2026-01-02',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.getOverview(owner, {
        dateFrom: '2025-01-01',
        dateTo: '2026-01-02',
      }),
    ).rejects.toThrow(BadRequestException);
  });
  describe('a move between teams', () => {
    // Emma is in North until Friday 13 March and in South from Monday 16.
    const MOVE_DAY = '2026-03-16';
    const NORTH_WORKING_DAYS = 10;
    const SOUTH_WORKING_DAYS = WORKING_DAYS_IN_MARCH - NORTH_WORKING_DAYS;

    let northManager: AuthUser;
    let southManager: AuthUser;
    let mover: string;
    let northId: string;
    let southId: string;

    beforeAll(async () => {
      northManager = await createUser('Northmanager', UserRole.MANAGER);
      southManager = await createUser('Southmanager', UserRole.MANAGER);
      mover = (await createUser('Emma', UserRole.EMPLOYEE)).id;

      const [north, south] = await dataSource.getRepository(Team).save([
        { companyId, name: `North ${RUN}` },
        { companyId, name: `South ${RUN}` },
      ]);
      northId = north.id;
      southId = south.id;
      const membership = (
        teamOf: string,
        userId: string,
        roleInTeam: TeamRole,
        joinedAt = '2020-01-01',
        leftAt: string | null = null,
      ) => ({
        companyId,
        teamId: teamOf,
        userId,
        roleInTeam,
        joinedAt,
        leftAt,
      });
      await dataSource
        .getRepository(TeamMembership)
        .save([
          membership(northId, northManager.id, TeamRole.MANAGER),
          membership(southId, southManager.id, TeamRole.MANAGER),
          membership(northId, mover, TeamRole.MEMBER, '2020-01-01', MOVE_DAY),
          membership(southId, mover, TeamRole.MEMBER, MOVE_DAY),
        ]);

      await dataSource.getRepository(TimeLog).save(
        [
          { date: '2026-03-12', isBillable: true },
          { date: '2026-03-18', isBillable: false },
        ].map((log) => ({
          ...log,
          companyId,
          userId: mover,
          projectActivityId,
          minutes: FULL_DAY,
        })),
      );
    });

    it("counts a mover's days for each team, and both parts under the owner", async () => {
      expect(await rowFor(northManager, mover)).toMatchObject({
        loggedMinutes: FULL_DAY,
        expectedMinutes: NORTH_WORKING_DAYS * FULL_DAY,
        teams: [
          {
            id: northId,
            figures: { loggedMinutes: FULL_DAY, billableMinutes: FULL_DAY },
            moves: [{ date: MOVE_DAY, direction: 'out' }],
          },
        ],
      });
      expect(await rowFor(southManager, mover)).toMatchObject({
        loggedMinutes: FULL_DAY,
        expectedMinutes: SOUTH_WORKING_DAYS * FULL_DAY,
        teams: [{ id: southId, moves: [{ date: MOVE_DAY, direction: 'in' }] }],
      });

      const forOwner = await rowFor(owner, mover);
      expect(forOwner).toMatchObject({
        loggedMinutes: 2 * FULL_DAY,
        expectedMinutes: WORKING_DAYS_IN_MARCH * FULL_DAY,
      });
      expect(
        forOwner?.teams.map(({ id, figures }) => [
          id,
          figures.loggedMinutes,
          figures.expectedMinutes,
        ]),
      ).toEqual([
        [northId, FULL_DAY, NORTH_WORKING_DAYS * FULL_DAY],
        [southId, FULL_DAY, SOUTH_WORKING_DAYS * FULL_DAY],
      ]);
    });

    it("keeps each team's export and timeline to its own days", async () => {
      const exportDates = async (team: string) =>
        (await reporting.getHoursExport(owner, { ...MARCH, teamId: team }))
          .filter((row) => row.email.startsWith('Emma'))
          .map((row) => row.date);

      expect(await exportDates(northId)).toEqual(['2026-03-12']);
      expect(await exportDates(southId)).toEqual(['2026-03-18']);

      const { timeline } = await service.getOverview(southManager, MARCH);
      expect(
        timeline.buckets.reduce((sum, bucket) => sum + bucket.loggedMinutes, 0),
      ).toBe(FULL_DAY);
    });
  });
});
