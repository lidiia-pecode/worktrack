import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { Activity } from 'src/activities/entities/activity.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import { Absence } from 'src/absences/entities/absence.entity';
import { AbsenceType } from 'src/absences/enums/absence-type.enum';
import { UserCapacity } from 'src/capacity/entities/user-capacity.entity';
import { CapacityService } from 'src/capacity/capacity.service';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { LONG_STANDING_ACCOUNT_CREATED_AT } from 'src/lib/testing/accounts';

import { ReportingPeriod } from '../entities/reporting-period.entity';
import { ReportingService } from '../reporting.service';
import { PeopleReportService } from './people-report.service';

/**
 * Runs against the development database, so it needs the Docker stack.
 * March 2026 has 22 working days and is long past its grace window.
 */

const RUN = Date.now();
const SLUG = `people-report-test-${RUN}`;

const MARCH = { dateFrom: '2026-03-01', dateTo: '2026-03-31' };
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
    const reporting = new ReportingService(
      dataSource.getRepository(ReportingPeriod),
      dataSource.getRepository(Company),
      teamVisibility,
    );
    const capacity = new CapacityService(
      dataSource.getRepository(UserCapacity),
      dataSource.getRepository(Company),
      dataSource.getRepository(User),
      reporting,
    );
    const expectedHours = new ExpectedHoursService(
      dataSource.getRepository(Absence),
      capacity,
    );
    service = new PeopleReportService(reporting, expectedHours, teamVisibility);

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

    const activity = await dataSource
      .getRepository(Activity)
      .save({ companyId, name: `Backend ${RUN}` });
    const project = await dataSource
      .getRepository(Project)
      .save({ companyId, name: `CRM ${RUN}`, clientName: 'Acme' });
    const projectActivity = await dataSource
      .getRepository(ProjectActivity)
      .save({ companyId, projectId: project.id, activityId: activity.id });

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

  it('is final for a locked month, counted in full', async () => {
    await expect(service.getPeopleReport(owner, MARCH)).resolves.toMatchObject({
      isProvisional: false,
      countedUntil: null,
    });
  });

  it('covers at most 366 days', async () => {
    await expect(
      service.getPeopleReport(owner, {
        dateFrom: '2025-01-01',
        dateTo: '2026-01-02',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
