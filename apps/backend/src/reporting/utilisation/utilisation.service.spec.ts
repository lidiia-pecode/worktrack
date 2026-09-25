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
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { Absence } from 'src/absences/entities/absence.entity';
import { AbsenceType } from 'src/absences/enums/absence-type.enum';
import { UserCapacity } from 'src/capacity/entities/user-capacity.entity';
import { CapacityService } from 'src/capacity/capacity.service';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import { todayISODate } from 'src/capacity/working-days.util';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { ReportingPeriod } from '../entities/reporting-period.entity';
import { ReportingService } from '../reporting.service';
import {
  addMonths,
  firstDayOfMonth,
  lastDayOfMonth,
} from '../reporting-months.util';
import { UtilisationService } from './utilisation.service';

/**
 * Runs against the development database, so it needs the Docker stack.
 * March 2026 has 22 working days and is long past its grace window.
 */

const RUN = Date.now();
const SLUG = `utilisation-test-${RUN}`;

const MARCH = { dateFrom: '2026-03-01', dateTo: '2026-03-31' };
const WORKING_DAYS_IN_MARCH = 22;
const FULL_DAY = 8 * 60;
const PART_TIME_WEEK = 24 * 60;

describe('UtilisationService', () => {
  let dataSource: DataSource;
  let service: UtilisationService;

  let companyId: string;
  let owner: AuthUser;
  let manager: AuthUser; // leads the team `member` and `awayAllMonth` are in
  let member: string; // full-time, two days off, logs time
  let awayAllMonth: string; // absent for the whole of March
  let partTimer: string; // on no team, 24 hours a week, logs nothing
  let loneManager: AuthUser; // has the MANAGER role but leads no team
  let clientWorkId: string;

  const createUser = async (name: string, role: UserRole) => {
    const email = `${name}-${RUN}@utilisation.test`;
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
    });

    return { id: user.id, email, companyId, role };
  };

  const rowFor = async (viewer: AuthUser, userId: string) => {
    const { rows } = await service.getUtilisation(viewer, MARCH);
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
    service = new UtilisationService(
      reporting,
      expectedHours,
      capacity,
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
    loneManager = await createUser('Lonemanager', UserRole.MANAGER);

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

    const category = await dataSource
      .getRepository(ActCategory)
      .save({ companyId, name: `Engineering ${RUN}` });
    const activity = await dataSource
      .getRepository(Activity)
      .save({ companyId, name: `Backend ${RUN}`, categoryId: category.id });

    const projectActivityFor = async (
      name: string,
      clientName: string | null,
    ) => {
      const project = await dataSource
        .getRepository(Project)
        .save({ companyId, name: `${name} ${RUN}`, clientName });
      const projectActivity = await dataSource
        .getRepository(ProjectActivity)
        .save({ companyId, projectId: project.id, activityId: activity.id });
      return projectActivity.id;
    };

    const clientWork = await projectActivityFor('CRM', 'Acme');
    clientWorkId = clientWork;
    const internalWork = await projectActivityFor('Tooling', null);

    await dataSource.getRepository(TimeLog).save(
      [
        { projectActivityId: clientWork, minutes: 960, isBillable: true },
        { projectActivityId: clientWork, minutes: 240, isBillable: false },
        { projectActivityId: internalWork, minutes: 240, isBillable: true },
      ].map((log) => ({
        ...log,
        companyId,
        userId: member,
        date: '2026-03-16',
      })),
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });
    await dataSource.destroy();
  });

  it('reads capacity and absences separately', async () => {
    const row = await rowFor(owner, member);

    expect(row).toMatchObject({
      capacityMinutes: WORKING_DAYS_IN_MARCH * FULL_DAY,
      absenceMinutes: 2 * FULL_DAY,
      availableMinutes: (WORKING_DAYS_IN_MARCH - 2) * FULL_DAY,
    });
  });

  it('works out the four figures', async () => {
    const row = await rowFor(owner, member);

    expect(row).toMatchObject({
      loggedMinutes: 1440,
      billableMinutes: 960,
      clientMinutes: 1200,
      nonBillableClientMinutes: 240,
      billableUtilisation: 0.1,
      nonBillableClientShare: 0.2,
      loggingCompleteness: 0.15,
    });
    expect(row?.clientShare).toBeCloseTo(1200 / 1440);
  });

  it('shows nothing to measure for somebody away all month', async () => {
    const row = await rowFor(owner, awayAllMonth);

    expect(row).toMatchObject({
      availableMinutes: 0,
      billableUtilisation: null,
      loggingCompleteness: null,
      clientShare: null,
    });
  });

  it('measures a part-timer against their own capacity', async () => {
    const row = await rowFor(owner, partTimer);

    expect(row).toMatchObject({
      capacityMinutes: (WORKING_DAYS_IN_MARCH * PART_TIME_WEEK) / 5,
      loggedMinutes: 0,
      loggingCompleteness: 0,
      nonBillableClientShare: null,
    });
  });

  it('adds up totals before dividing', async () => {
    const { totals } = await service.getUtilisation(owner, MARCH);

    expect(totals.loggedMinutes).toBe(1440);
    expect(totals.billableUtilisation).toBeCloseTo(
      960 / totals.availableMinutes,
    );
  });

  it("shows a manager only their team's people", async () => {
    const { rows } = await service.getUtilisation(manager, MARCH);

    expect(rows.map((row) => row.userId).sort()).toEqual(
      [manager.id, member, awayAllMonth].sort(),
    );
  });

  it('gives a manager who leads no team their own row with their hours', async () => {
    const log = await dataSource.getRepository(TimeLog).save({
      companyId,
      userId: loneManager.id,
      projectActivityId: clientWorkId,
      date: '2026-03-16',
      minutes: 120,
      isBillable: true,
    });

    const { rows } = await service.getUtilisation(loneManager, MARCH);

    expect(rows.map((row) => row.userId)).toEqual([loneManager.id]);
    expect(rows[0].loggedMinutes).toBe(120);
    await dataSource.getRepository(TimeLog).delete({ id: log.id });
  });

  it('counts only days that have finished', async () => {
    const nextMonth = addMonths(firstDayOfMonth(todayISODate('UTC')), 1);
    const dateFrom = nextMonth;
    const dateTo = lastDayOfMonth(nextMonth);

    const { rows } = await service.getUtilisation(owner, { dateFrom, dateTo });
    const row = rows.find((r) => r.userId === member);

    expect(row).toMatchObject({
      capacityMinutes: 0,
      availableMinutes: 0,
      billableUtilisation: null,
      loggingCompleteness: null,
    });
  });

  it('leaves out time logged today, like the availability it is measured against', async () => {
    const today = todayISODate('UTC');
    const thisMonth = firstDayOfMonth(today);
    const log = await dataSource.getRepository(TimeLog).save({
      companyId,
      userId: partTimer,
      projectActivityId: clientWorkId,
      date: today,
      minutes: 60,
      isBillable: true,
    });

    const { rows } = await service.getUtilisation(owner, {
      dateFrom: thisMonth,
      dateTo: lastDayOfMonth(thisMonth),
    });

    expect(rows.find((r) => r.userId === partTimer)?.loggedMinutes).toBe(0);
    await dataSource.getRepository(TimeLog).delete({ id: log.id });
  });

  it('is final for a locked month', async () => {
    await expect(service.getUtilisation(owner, MARCH)).resolves.toMatchObject({
      isProvisional: false,
    });
  });

  it('covers at most 366 days', async () => {
    await expect(
      service.getUtilisation(owner, {
        dateFrom: '2025-01-01',
        dateTo: '2026-01-01',
      }),
    ).resolves.toBeDefined();
    await expect(
      service.getUtilisation(owner, {
        dateFrom: '2025-01-01',
        dateTo: '2026-01-02',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
