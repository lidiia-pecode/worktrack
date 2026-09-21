import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { TimeLog } from './entities/time-log.entity';
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
      teamVisibility,
    );

    service = new TimeLogsService(
      dataSource.getRepository(TimeLog),
      dataSource.getRepository(ProjectActivity),
      reporting,
      teamVisibility,
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

    const otherCompany = await dataSource
      .getRepository(Company)
      .save({ companyName: OTHER_SLUG, slug: OTHER_SLUG });
    stranger = await createUser('stranger', UserRole.EMPLOYEE, otherCompany.id);

    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Alpha ${RUN}` });

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
    for (const user of [owner, manager, member, outsider]) {
      await dataSource.query(
        'INSERT INTO project_users (project_id, user_id) VALUES ($1, $2)',
        [project.id, user.id],
      );
    }

    await dataSource.getRepository(ReportingPeriod).save({
      companyId,
      name: `Locked ${RUN}`,
      startDate: LOCKED_DATE,
      endDate: LOCKED_DATE,
      status: ReportingPeriodStatus.LOCKED,
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
});
