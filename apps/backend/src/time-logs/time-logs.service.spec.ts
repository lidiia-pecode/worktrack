import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';

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
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { ReportingPeriodStatus } from 'src/reporting/enums/reporting-period-status.enum';
import { ReportingService } from 'src/reporting/reporting.service';
import { Absence } from 'src/absences/entities/absence.entity';
import { UserCapacity } from 'src/capacity/entities/user-capacity.entity';
import { CapacityService } from 'src/capacity/capacity.service';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import {
  freezeAtFirstLockedSecond,
  freezeAtLastGraceSecond,
  timeZoneOnAnotherDay,
} from 'src/lib/testing/time-zones';

import { TimeLog } from './entities/time-log.entity';
import { TimeLogsQuery } from './dtos/time-logs-query.dto';
import { TimeLogsService } from './time-logs.service';

/**
 * Runs against the development database, so it needs the Docker stack. The
 * rules under test are about who may write whose entry, and a mocked
 * repository would happily pass with the wrong user id threaded through.
 */

const RUN = Date.now();
const SLUG = `timelog-write-test-${RUN}`;
const OTHER_SLUG = `timelog-write-other-${RUN}`;

const DATE = '2026-02-10';
const LOCKED_DATE = '2026-03-10';

describe('TimeLogsService write scope', () => {
  let dataSource: DataSource;
  let service: TimeLogsService;

  let companyId: string;
  let owner: AuthUser;
  let manager: AuthUser; // leads "Alpha"
  let member: AuthUser; // in "Alpha", assigned to the project
  let outsider: AuthUser; // in the company, on no team, assigned to the project
  let unassigned: AuthUser; // in "Alpha" but not on the project
  let stranger: AuthUser; // a different company entirely
  let loneManager: AuthUser; // has the MANAGER role but leads no team

  let teamId: string;
  let projectActivityId: string;

  const createUser = async (
    name: string,
    role: UserRole,
    inCompanyId = companyId,
  ): Promise<AuthUser> => {
    const email = `${name}-${RUN}@timelog.test`;
    const user = await dataSource.getRepository(User).save({
      companyId: inCompanyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
    });

    return { id: user.id, email, companyId: inCompanyId, role };
  };

  const logFor = (ownerId: string, date = DATE) => ({
    userId: ownerId,
    projectActivityId,
    minutes: 60,
    date,
  });

  const existingLogFor = async (ownerId: string, date = DATE) => {
    const log = await dataSource.getRepository(TimeLog).save({
      companyId,
      userId: ownerId,
      projectActivityId,
      minutes: 60,
      date,
      isBillable: true,
    });

    return log.id;
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

    service = new TimeLogsService(
      dataSource.getRepository(TimeLog),
      dataSource.getRepository(ProjectActivity),
      reporting,
      teamVisibility,
      new ExpectedHoursService(
        dataSource.getRepository(Absence),
        new CapacityService(
          dataSource.getRepository(UserCapacity),
          dataSource.getRepository(Company),
          dataSource.getRepository(User),
          reporting,
        ),
      ),
      dataSource,
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;

    owner = await createUser('owner', UserRole.OWNER);
    manager = await createUser('manager', UserRole.MANAGER);
    member = await createUser('member', UserRole.EMPLOYEE);
    outsider = await createUser('outsider', UserRole.EMPLOYEE);
    unassigned = await createUser('unassigned', UserRole.EMPLOYEE);
    loneManager = await createUser('lonemanager', UserRole.MANAGER);

    const otherCompany = await dataSource
      .getRepository(Company)
      .save({ companyName: OTHER_SLUG, slug: OTHER_SLUG });
    stranger = await createUser('stranger', UserRole.EMPLOYEE, otherCompany.id);

    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Alpha ${RUN}` });
    teamId = team.id;

    for (const [user, roleInTeam] of [
      [manager, TeamRole.MANAGER],
      [member, TeamRole.MEMBER],
      [unassigned, TeamRole.MEMBER],
    ] as const) {
      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: team.id,
        userId: user.id,
        roleInTeam,
        joinedAt: '2026-01-01',
      });
    }

    const category = await dataSource
      .getRepository(ActCategory)
      .save({ companyId, name: `Category ${RUN}` });

    const activity = await dataSource.getRepository(Activity).save({
      companyId,
      name: `Activity ${RUN}`,
      categoryId: category.id,
    });

    const project = await dataSource
      .getRepository(Project)
      .save({ companyId, name: `Project ${RUN}` });

    const projectActivity = await dataSource
      .getRepository(ProjectActivity)
      .save({ companyId, projectId: project.id, activityId: activity.id });

    projectActivityId = projectActivity.id;

    // Everyone but `unassigned` can log against the project.
    for (const user of [owner, manager, member, outsider, loneManager]) {
      await dataSource.query(
        'INSERT INTO project_users (project_id, user_id) VALUES ($1, $2)',
        [project.id, user.id],
      );
    }

    // Past months lock by themselves: February is reopened so tests can write
    // to it, and March (LOCKED_DATE) stays locked.
    await dataSource.getRepository(ReportingPeriod).save({
      companyId,
      month: '2026-02-01',
      status: ReportingPeriodStatus.OPEN,
    });
  });

  afterEach(async () => {
    await dataSource.getRepository(TimeLog).delete({ companyId });
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    // project_users has no cascade from users, so it goes first.
    await dataSource.query(
      'DELETE FROM project_users WHERE user_id IN (SELECT id FROM users WHERE company_id = $1)',
      [companyId],
    );

    await dataSource
      .getRepository(Company)
      .delete({ slug: In([SLUG, OTHER_SLUG]) });
    await dataSource.destroy();
  });

  describe('create', () => {
    it('lets anyone log their own time', async () => {
      const log = await service.create(logFor(member.id), member);

      expect(log.userId).toBe(member.id);
    });

    it('defaults the owner to the caller', async () => {
      const log = await service.create(
        { projectActivityId, minutes: 60, date: DATE },
        member,
      );

      expect(log.userId).toBe(member.id);
    });

    it('lets an owner log for anyone in the company', async () => {
      const log = await service.create(logFor(outsider.id), owner);

      expect(log.userId).toBe(outsider.id);
    });

    it('lets a manager log for someone in a team they lead', async () => {
      const log = await service.create(logFor(member.id), manager);

      expect(log.userId).toBe(member.id);
    });

    it('refuses a manager for someone on no team of theirs', async () => {
      await expect(
        service.create(logFor(outsider.id), manager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses an employee for anyone but themselves', async () => {
      await expect(service.create(logFor(member.id), outsider)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('checks project membership against the entry owner, not the caller', async () => {
      await expect(
        service.create(logFor(unassigned.id), manager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('counts the daily limit against the entry owner', async () => {
      await service.create(
        { userId: member.id, projectActivityId, minutes: 1400, date: DATE },
        manager,
      );

      await expect(
        service.create(
          { userId: member.id, projectActivityId, minutes: 100, date: DATE },
          manager,
        ),
      ).rejects.toThrow(/Daily time limit/);
    });

    it('refuses an owner for a user in another company', async () => {
      await expect(service.create(logFor(stranger.id), owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('refuses any role inside a locked period', async () => {
      await expect(
        service.create(logFor(member.id, LOCKED_DATE), owner),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update and delete', () => {
    it("lets an owner change anyone's entry", async () => {
      const id = await existingLogFor(outsider.id);

      const updated = await service.update(id, { minutes: 90 }, owner);

      expect(updated.minutes).toBe(90);
      expect(updated.userId).toBe(outsider.id);
    });

    it('lets a manager change an entry in a team they lead', async () => {
      const id = await existingLogFor(member.id);

      await expect(
        service.update(id, { minutes: 90 }, manager),
      ).resolves.toMatchObject({ minutes: 90 });
    });

    it('refuses a manager for an entry outside their teams', async () => {
      const id = await existingLogFor(outsider.id);

      await expect(
        service.update(id, { minutes: 90 }, manager),
      ).rejects.toThrow(ForbiddenException);
    });

    it("refuses an employee for someone else's entry", async () => {
      const id = await existingLogFor(member.id);

      await expect(
        service.update(id, { minutes: 90 }, outsider),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lets a manager delete an entry in a team they lead', async () => {
      const id = await existingLogFor(member.id);

      await expect(service.delete(id, manager)).resolves.toEqual({
        success: true,
      });
    });

    it("refuses a delete outside the caller's scope", async () => {
      const id = await existingLogFor(outsider.id);

      await expect(service.delete(id, manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses a change inside a locked period', async () => {
      const id = await existingLogFor(member.id, LOCKED_DATE);

      await expect(service.update(id, { minutes: 90 }, owner)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('reports a missing entry as not found', async () => {
      await expect(
        service.update(
          '00000000-0000-4000-8000-000000000000',
          { minutes: 90 },
          owner,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('pages through entries saved together once each, in a fixed order', async () => {
      // One transaction gives every row the same date and created_at.
      const saved = await dataSource.transaction((manager) =>
        manager.getRepository(TimeLog).save(
          Array.from({ length: 5 }, () => ({
            ...logFor(member.id),
            companyId,
            isBillable: true,
          })),
        ),
      );
      const createdAt = new Set(saved.map((log) => log.createdAt.getTime()));
      expect(createdAt.size).toBe(1);

      const pageOf = (page: number) =>
        service.list(
          Object.assign(new TimeLogsQuery(), {
            userId: member.id,
            page,
            pageSize: 2,
          }),
          owner,
        );

      const pages = await Promise.all([1, 2, 3].map(pageOf));
      const pagedIds = pages.flatMap((page) =>
        page.results.map((log) => log.id),
      );

      const expectedIds = saved
        .map((log) => log.id)
        .sort()
        .reverse();
      expect(pagedIds).toEqual(expectedIds);
      expect(pages[0].count).toBe(5);
    });

    it('lets a manager who leads no team read their own entries', async () => {
      const id = await existingLogFor(loneManager.id);
      const listFor = (userId: string) =>
        service.list(
          Object.assign(new TimeLogsQuery(), { userId }),
          loneManager,
        );

      expect((await listFor(loneManager.id)).count).toBe(1);
      expect((await service.getById(id, loneManager)).id).toBe(id);
      await expect(listFor(member.id)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('team summary', () => {
    it('covers at most 366 days', async () => {
      await expect(
        service.getTeamSummary(
          { dateFrom: '2025-01-01', dateTo: '2026-01-01' },
          owner,
        ),
      ).resolves.toBeDefined();
      await expect(
        service.getTeamSummary(
          { dateFrom: '2025-01-01', dateTo: '2026-01-02' },
          owner,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    const weekOf = (by: AuthUser, filter: { teamId?: string } = {}) =>
      service.getTeamSummary({ dateFrom: DATE, dateTo: DATE, ...filter }, by);

    it('gives a manager who leads no team their own row with their time', async () => {
      await existingLogFor(loneManager.id);
      await existingLogFor(member.id);

      const { rows } = await weekOf(loneManager);

      expect(rows.map((row) => row.user.id)).toEqual([loneManager.id]);
      expect(rows[0].minutes).toBe(60);
    });

    it('leaves them out of a team they are not in', async () => {
      await existingLogFor(loneManager.id);

      const { rows } = await weekOf(loneManager, { teamId });

      expect(rows).toEqual([]);
    });

    it('lists a manager who leads a team once', async () => {
      const { rows } = await weekOf(manager);
      const ids = rows.map((row) => row.user.id);

      expect(ids.filter((id) => id === manager.id)).toHaveLength(1);
      expect(ids.sort()).toEqual([manager.id, member.id, unassigned.id].sort());
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

    it('accepts an entry on the last day of the grace window', async () => {
      freezeAtLastGraceSecond(MONTH, TIME_ZONE);

      await expect(
        service.create(logFor(member.id, DATE_IN_MONTH), owner),
      ).resolves.toBeDefined();
    });

    it('refuses an entry from the first locked day', async () => {
      freezeAtFirstLockedSecond(MONTH, TIME_ZONE);

      await expect(
        service.create(logFor(member.id, DATE_IN_MONTH), owner),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
