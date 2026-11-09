import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { PaginationQuery } from 'src/lib/dtos/pagination-query.dto';
import { Company } from 'src/companies/entities/company.entity';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { TeamsService } from 'src/teams/teams.service';
import { CapacityService } from 'src/capacity/capacity.service';
import { UserCapacity } from 'src/capacity/entities/user-capacity.entity';
import { CompanyStandardDay } from 'src/capacity/entities/company-standard-day.entity';
import { ReportingService } from 'src/reporting/reporting.service';
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { timeZoneOnAnotherDay } from 'src/lib/testing/time-zones';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { AuthSession } from 'src/auth/entities/auth-session.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import { Absence } from 'src/absences/entities/absence.entity';
import { AbsenceType } from 'src/absences/enums/absence-type.enum';
import { addDays, todayISODate } from 'src/capacity/working-days.util';

import { User } from './entities/user.entity';
import { UserInactivePeriod } from './entities/user-inactive-period.entity';
import { UserRole, UserStatus } from './enums/user-role.enum';
import { AssignableUsersQuery } from './dtos/assignable-users-query.dto';
import { UsersQuery } from './dtos/users-query.dto';
import { UsersService } from './users.service';

/**
 * Runs against the development database, so it needs the Docker stack. The
 * rule under test is who appears in a manager's user list, and a mocked
 * repository would pass whatever the query happened to be.
 */

const RUN = Date.now();
const SLUG = `users-scope-test-${RUN}`;
const PAGE = Object.assign(new PaginationQuery(), { pageSize: 50 });
const searchFor = (search: string) =>
  Object.assign(new UsersQuery(), { pageSize: 50, search });
const TIME_ZONE = timeZoneOnAnotherDay();

describe('UsersService scope', () => {
  let dataSource: DataSource;
  let service: UsersService;
  let capacity: CapacityService;
  let reporting: ReportingService;

  let companyId: string;
  let owner: AuthUser;
  let manager: AuthUser; // leads "Alpha"
  let member: AuthUser; // in "Alpha"
  let outsider: AuthUser; // in the company, on no team of the manager's
  let leadNothing: AuthUser; // a manager who leads no team
  let alphaId: string;

  const createUser = async (
    name: string,
    role: UserRole,
  ): Promise<AuthUser> => {
    const email = `${name}-${RUN}@userscope.test`;
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
      status: UserStatus.ACTIVE,
    });

    return { id: user.id, email, companyId, role };
  };

  const listedIds = async (caller: AuthUser) => {
    const { results } = await service.list(companyId, PAGE, caller);
    return results.map((user) => user.id);
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
    capacity = new CapacityService(
      dataSource.getRepository(UserCapacity),
      dataSource.getRepository(Company),
      dataSource.getRepository(User),
      dataSource.getRepository(UserInactivePeriod),
      dataSource.getRepository(CompanyStandardDay),
      reporting,
    );
    service = new UsersService(
      dataSource.getRepository(User),
      teamVisibility,
      dataSource,
      capacity,
      reporting,
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG, timezone: TIME_ZONE });
    companyId = company.id;

    owner = await createUser('owner', UserRole.OWNER);
    manager = await createUser('manager', UserRole.MANAGER);
    member = await createUser('member', UserRole.EMPLOYEE);
    outsider = await createUser('outsider', UserRole.EMPLOYEE);
    leadNothing = await createUser('leadnothing', UserRole.MANAGER);

    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Alpha ${RUN}` });
    alphaId = team.id;

    for (const [user, roleInTeam] of [
      [manager, TeamRole.MANAGER],
      [member, TeamRole.MEMBER],
    ] as const) {
      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: team.id,
        userId: user.id,
        roleInTeam,
        joinedAt: '2026-01-01',
      });
    }
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    // A project's members go with it, and would otherwise hold on to the users.
    await dataSource.getRepository(TimeLog).delete({ companyId });
    await dataSource.getRepository(PlanningEntry).delete({ companyId });
    await dataSource.getRepository(Project).delete({ companyId });
    await dataSource.getRepository(Company).delete({ slug: In([SLUG]) });
    await dataSource.destroy();
  });

  describe('list', () => {
    it('shows an owner the whole company, themselves included', async () => {
      const ids = await listedIds(owner);

      expect(ids).toEqual(
        expect.arrayContaining([
          owner.id,
          manager.id,
          member.id,
          outsider.id,
          leadNothing.id,
        ]),
      );
    });

    it('shows a manager their own team, and themselves', async () => {
      const ids = await listedIds(manager);

      expect(ids.sort()).toEqual([manager.id, member.id].sort());
    });

    it('hides a user on no team of the manager', async () => {
      expect(await listedIds(manager)).not.toContain(outsider.id);
    });

    it('shows a manager who leads no team nobody', async () => {
      expect(await listedIds(leadNothing)).toEqual([]);
    });
  });

  describe('list search', () => {
    const foundIds = async (search: string) => {
      const { results } = await service.list(
        companyId,
        searchFor(search),
        owner,
      );
      return results.map((user) => user.id);
    };

    it('matches a name, ignoring case', async () => {
      expect(await foundIds('OUTSIDER')).toEqual([outsider.id]);
    });

    it('matches an email and a position', async () => {
      await dataSource
        .getRepository(User)
        .update(member.id, { position: 'Quality Lead' });

      expect(await foundIds(`outsider-${RUN}@`)).toEqual([outsider.id]);
      expect(await foundIds('quality')).toEqual([member.id]);
    });

    it('stays within what a manager can see', async () => {
      const { results } = await service.list(
        companyId,
        searchFor('outsider'),
        manager,
      );

      expect(results).toEqual([]);
    });
  });

  describe('list rows', () => {
    const rowOf = async (caller: AuthUser, userId: string) => {
      const { results } = await service.list(companyId, PAGE, caller);
      return results.find((user) => user.id === userId)!;
    };

    beforeAll(async () => {
      for (const status of [ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED]) {
        await dataSource.getRepository(Project).save({
          companyId,
          name: `${status} project ${RUN}`,
          status,
          users: [{ id: member.id }],
        });
      }
    });

    it('names their one team and their role in it', async () => {
      expect((await rowOf(owner, member.id)).team).toEqual({
        id: alphaId,
        name: `Alpha ${RUN}`,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: '2026-01-01',
      });
    });

    it('gives a person in no team none', async () => {
      expect((await rowOf(owner, outsider.id)).team).toBeNull();
    });

    it('counts active projects only', async () => {
      expect((await rowOf(owner, member.id)).projectsCount).toBe(1);
      expect((await rowOf(owner, outsider.id)).projectsCount).toBe(0);
    });

    it("gives an owner today's weekly capacity", async () => {
      const row = await rowOf(owner, member.id);

      const { defaultTimeline } = await capacity.calendarFor(companyId);

      expect(row.weeklyMinutes).toBe(
        defaultTimeline.minutesPerWeekOn(todayISODate(TIME_ZONE)),
      );
    });

    it('gives a manager no capacity', async () => {
      expect((await rowOf(manager, member.id)).weeklyMinutes).toBeUndefined();
    });
  });

  describe('listAssignable', () => {
    const assignableIds = async (caller: AuthUser) => {
      const { results } = await service.listAssignable(companyId, PAGE, caller);
      return results.map((user) => user.id);
    };

    it('stays company-wide for an owner', async () => {
      expect(await assignableIds(owner)).toEqual(
        expect.arrayContaining([
          owner.id,
          manager.id,
          member.id,
          outsider.id,
          leadNothing.id,
        ]),
      );
    });

    it('narrows a manager to their own people, and themselves', async () => {
      const ids = await assignableIds(manager);

      expect(ids.sort()).toEqual([manager.id, member.id].sort());
    });

    it('offers a manager who leads no team only themselves', async () => {
      expect(await assignableIds(leadNothing)).toEqual([leadNothing.id]);
    });

    it("names each person's team and their role in it", async () => {
      const solo = await createUser('solo', UserRole.EMPLOYEE);
      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: alphaId,
        userId: solo.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: '2026-01-01',
      });

      const { results } = await service.listAssignable(companyId, PAGE, owner);
      const teamOf = (id: string) =>
        results.find((user) => user.id === id)?.team;

      expect(teamOf(solo.id)).toMatchObject({
        id: alphaId,
        roleInTeam: TeamRole.MEMBER,
      });
      expect(teamOf(manager.id)).toMatchObject({
        id: alphaId,
        roleInTeam: TeamRole.MANAGER,
      });
      expect(teamOf(outsider.id)).toBeNull();
    });

    it('narrows to people in no team when asked', async () => {
      const { results } = await service.listAssignable(
        companyId,
        Object.assign(new AssignableUsersQuery(), {
          ...PAGE,
          noTeam: true,
        }),
        owner,
      );
      const ids = results.map((user) => user.id);

      expect(ids).toEqual(
        expect.arrayContaining([outsider.id, leadNothing.id]),
      );
      expect(ids).not.toContain(member.id);
      expect(ids).not.toContain(manager.id);
    });

    const rolesListed = async (roles: UserRole[]) => {
      const { results } = await service.listAssignable(
        companyId,
        Object.assign(new AssignableUsersQuery(), { pageSize: 50, roles }),
        owner,
      );
      return new Set(results.map((user) => user.role));
    };

    it('lists the roles asked for: Managers to lead a team, anyone but the owner to join one', async () => {
      await expect(rolesListed([UserRole.MANAGER])).resolves.toEqual(
        new Set([UserRole.MANAGER]),
      );
      await expect(
        rolesListed([UserRole.EMPLOYEE, UserRole.MANAGER]),
      ).resolves.toEqual(new Set([UserRole.EMPLOYEE, UserRole.MANAGER]));
    });

    it('searches, and keeps owners, who can be put on a project', async () => {
      const { results } = await service.listAssignable(
        companyId,
        searchFor('owner'),
        owner,
      );

      expect(results.map((user) => user.id)).toEqual([owner.id]);
    });
  });

  describe('getUserDetailsById', () => {
    it('lets an owner read anyone in the company', async () => {
      const user = await service.getUserDetailsById(
        outsider.id,
        companyId,
        owner,
      );

      expect(user.id).toBe(outsider.id);
    });

    it('lets a manager read someone in a team they lead', async () => {
      const user = await service.getUserDetailsById(
        member.id,
        companyId,
        manager,
      );

      expect(user.id).toBe(member.id);
    });

    it('refuses a manager for someone outside their teams', async () => {
      await expect(
        service.getUserDetailsById(outsider.id, companyId, manager),
      ).rejects.toThrow(NotFoundException);
    });

    it('names their team with the role and joining date', async () => {
      const { team } = await service.getUserDetailsById(
        member.id,
        companyId,
        owner,
      );

      expect(team).toEqual({
        id: alphaId,
        name: `Alpha ${RUN}`,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: '2026-01-01',
      });
    });
  });

  describe('an employee removed from their last team', () => {
    let teams: TeamsService;
    let leaver: AuthUser;

    beforeAll(async () => {
      const teamVisibility = new TeamVisibilityService(
        dataSource.getRepository(TeamMembership),
        dataSource.getRepository(User),
      );
      teams = new TeamsService(
        dataSource.getRepository(Team),
        teamVisibility,
        dataSource,
      );

      leaver = await createUser('leaver', UserRole.EMPLOYEE);
      const membership = await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: alphaId,
        userId: leaver.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: '2026-01-01',
      });

      await teams.removeMember(membership.id, companyId, alphaId, manager);
    });

    it('stays in the owner lists', async () => {
      await expect(listedIds(owner)).resolves.toContain(leaver.id);

      const { results } = await service.listAssignable(companyId, PAGE, owner);
      expect(results.map((user) => user.id)).toContain(leaver.id);
    });

    it('is gone from the manager of their old team', async () => {
      await expect(listedIds(manager)).resolves.not.toContain(leaver.id);

      await expect(
        service.getUserDetailsById(leaver.id, companyId, manager),
      ).rejects.toThrow(NotFoundException);
    });

    it('can be placed again by the owner the same day', async () => {
      await teams.addMember(alphaId, companyId, { userId: leaver.id });

      await expect(listedIds(manager)).resolves.toContain(leaver.id);
    });
  });

  describe('changing a Manager to Employee', () => {
    const leadTeam = async (
      user: AuthUser,
      teamName: string,
      { status = TeamStatus.ACTIVE, leftAt = null as string | null } = {},
    ) => {
      const team = await dataSource
        .getRepository(Team)
        .save({ companyId, name: `${teamName} ${RUN}`, status });

      return dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: team.id,
        userId: user.id,
        roleInTeam: TeamRole.MANAGER,
        joinedAt: '2026-01-01',
        leftAt,
      });
    };

    const demote = (user: AuthUser) =>
      service.updateUser(
        user.id,
        companyId,
        { role: UserRole.EMPLOYEE },
        owner,
      );

    it('is allowed for a Manager who manages no team', async () => {
      const teamless = await createUser('teamlessmanager', UserRole.MANAGER);

      const updated = await demote(teamless);

      expect(updated.role).toBe(UserRole.EMPLOYEE);
    });

    it('is refused while they lead a team, naming it; nothing changes', async () => {
      const leader = await createUser('keptleader', UserRole.MANAGER);
      const membership = await leadTeam(leader, 'Epsilon');

      await expect(demote(leader)).rejects.toThrow(
        `This person leads Epsilon ${RUN}`,
      );

      await expect(
        dataSource.getRepository(User).findOneByOrFail({ id: leader.id }),
      ).resolves.toMatchObject({ role: UserRole.MANAGER });
      await expect(
        dataSource
          .getRepository(TeamMembership)
          .findOneByOrFail({ id: membership.id }),
      ).resolves.toMatchObject({ leftAt: null, roleInTeam: TeamRole.MANAGER });
    });

    it('is allowed once they no longer manage the team', async () => {
      const former = await createUser('formerleader', UserRole.MANAGER);
      await leadTeam(former, 'Zeta', { leftAt: '2026-02-01' });

      await expect(demote(former)).resolves.toMatchObject({
        role: UserRole.EMPLOYEE,
      });
    });

    it("is refused for the owner's own role", async () => {
      await expect(
        service.updateUser(
          owner.id,
          companyId,
          { role: UserRole.EMPLOYEE },
          owner,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateUser(owner.id, companyId, { position: 'Founder' }, owner),
      ).resolves.toMatchObject({ role: UserRole.OWNER });
    });

    it('refuses making anyone a second owner', async () => {
      const employee = await createUser('ownerbound', UserRole.EMPLOYEE);

      await expect(
        service.updateUser(
          employee.id,
          companyId,
          { role: UserRole.OWNER },
          owner,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        dataSource.getRepository(User).findOneByOrFail({ id: employee.id }),
      ).resolves.toMatchObject({ role: UserRole.EMPLOYEE });
    });

    it('is not blocked by an archived team', async () => {
      const archivedLeader = await createUser(
        'archivedleader',
        UserRole.MANAGER,
      );
      await leadTeam(archivedLeader, 'Eta', { status: TeamStatus.ARCHIVED });

      await expect(demote(archivedLeader)).resolves.toMatchObject({
        role: UserRole.EMPLOYEE,
      });
    });
  });

  describe('paging through people who tie', () => {
    const PAGE_SIZE = 2;
    let tiedIds: string[];

    const pagedIds = async (
      fetchPage: (
        page: PaginationQuery,
      ) => Promise<{ results: User[]; count: number }>,
    ) => {
      const ids: string[] = [];
      let count = Infinity;

      for (let page = 1; (page - 1) * PAGE_SIZE < count; page += 1) {
        const result = await fetchPage(
          Object.assign(new PaginationQuery(), { page, pageSize: PAGE_SIZE }),
        );
        count = result.count;
        ids.push(...result.results.map((user) => user.id));
      }

      return { ids, count };
    };

    beforeAll(async () => {
      // One transaction gives every row the same created_at, and they share a name.
      const tied = await dataSource.transaction((manager) =>
        manager.getRepository(User).save(
          Array.from({ length: 5 }, (_, index) => ({
            companyId,
            role: UserRole.EMPLOYEE,
            firstName: 'tied',
            lastName: 'Test',
            email: `tied-${index}-${RUN}@userscope.test`,
            status: UserStatus.ACTIVE,
          })),
        ),
      );
      tiedIds = tied.map((user) => user.id);

      const createdAt = new Set(tied.map((user) => user.createdAt.getTime()));
      expect(createdAt.size).toBe(1);
    });

    it('lists users created together once each, in a fixed order', async () => {
      const { ids, count } = await pagedIds((page) =>
        service.list(companyId, page, owner),
      );

      expect(new Set(ids).size).toBe(count);
      expect(ids.filter((id) => tiedIds.includes(id))).toEqual(
        [...tiedIds].sort().reverse(),
      );
    });

    it('lists assignable people who share a name once each, in a fixed order', async () => {
      const { ids, count } = await pagedIds((page) =>
        service.listAssignable(companyId, page, owner),
      );

      expect(new Set(ids).size).toBe(count);
      expect(ids.filter((id) => tiedIds.includes(id))).toEqual(
        [...tiedIds].sort(),
      );
    });
  });

  describe('deactivating and reactivating', () => {
    const today = todayISODate(TIME_ZONE);
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);

    /** Someone who joined long ago, so any recent day can be their last. */
    const createLongServing = async (name: string) => {
      const person = await createUser(name, UserRole.EMPLOYEE);
      await dataSource
        .getRepository(User)
        .update(person.id, { createdAt: new Date('2026-01-01T12:00:00Z') });
      return person;
    };

    const spellsOf = (userId: string) =>
      dataSource
        .getRepository(UserInactivePeriod)
        .findBy({ companyId, userId });

    it('keeps the last working day open and closes the days after it', async () => {
      const leaver = await createLongServing('lastday');

      const archived = await service.archive(
        leaver.id,
        owner.id,
        companyId,
        yesterday,
      );

      expect(archived.status).toBe(UserStatus.DEACTIVATED);
      expect(archived.lastWorkingDay).toBe(yesterday);
      await expect(
        capacity.assertEmployedOn(companyId, leaver.id, yesterday),
      ).resolves.toBeUndefined();
      await expect(
        capacity.assertEmployedOn(companyId, leaver.id, today),
      ).rejects.toThrow(BadRequestException);
    });

    it('removes what is recorded after the last working day, and cuts an absence across it', async () => {
      const leaver = await createLongServing('cleanup');
      const category = await dataSource
        .getRepository(ActCategory)
        .save({ companyId, name: `Category ${RUN}` });
      const activity = await dataSource
        .getRepository(Activity)
        .save({ companyId, name: `Activity ${RUN}`, categoryId: category.id });
      const project = await dataSource
        .getRepository(Project)
        .save({ companyId, name: `Cleanup ${RUN}` });
      const projectActivity = await dataSource
        .getRepository(ProjectActivity)
        .save({ companyId, projectId: project.id, activityId: activity.id });
      const forLeaver = { companyId, userId: leaver.id };

      await dataSource.getRepository(TimeLog).save(
        [yesterday, today].map((date) => ({
          ...forLeaver,
          projectActivityId: projectActivity.id,
          minutes: 60,
          date,
        })),
      );
      await dataSource.getRepository(PlanningEntry).save(
        [yesterday, today, tomorrow].map((date) => ({
          ...forLeaver,
          projectId: project.id,
          plannedMinutes: 120,
          date,
        })),
      );
      const [across, later] = await dataSource.getRepository(Absence).save([
        {
          ...forLeaver,
          type: AbsenceType.SICK_LEAVE,
          startDate: yesterday,
          endDate: tomorrow,
        },
        {
          ...forLeaver,
          type: AbsenceType.VACATION,
          startDate: addDays(tomorrow, 7),
          endDate: addDays(tomorrow, 9),
        },
      ]);

      const impact = await service.deactivationImpact(
        leaver.id,
        companyId,
        yesterday,
      );
      expect(impact.time).toEqual({
        entryCount: 1,
        minutes: 60,
        firstDate: today,
        lastDate: today,
      });
      expect(impact.absences.map(({ id, isCut }) => ({ id, isCut }))).toEqual([
        { id: across.id, isCut: true },
        { id: later.id, isCut: false },
      ]);
      expect(impact.plans).toEqual([
        {
          projectId: project.id,
          projectName: project.name,
          planCount: 2,
          firstDate: today,
          lastDate: tomorrow,
        },
      ]);

      await service.archive(leaver.id, owner.id, companyId, yesterday);

      const datesOf = async (entity: typeof TimeLog | typeof PlanningEntry) =>
        (await dataSource.getRepository(entity).findBy(forLeaver)).map(
          (record) => record.date,
        );
      await expect(datesOf(TimeLog)).resolves.toEqual([yesterday]);
      await expect(datesOf(PlanningEntry)).resolves.toEqual([yesterday]);
      const absences = await dataSource
        .getRepository(Absence)
        .findBy(forLeaver);
      expect(absences).toHaveLength(1);
      expect(absences[0]).toMatchObject({
        id: across.id,
        endDate: yesterday,
        updatedById: owner.id,
      });
    });

    it('refuses a last working day after today or before they joined', async () => {
      const joinedToday = await createUser('newcomer', UserRole.EMPLOYEE);

      await expect(
        service.archive(joinedToday.id, owner.id, companyId, tomorrow),
      ).rejects.toThrow('after today');
      await expect(
        service.archive(joinedToday.id, owner.id, companyId, yesterday),
      ).rejects.toThrow('before they joined');
    });

    it('takes the last day of a locked month, since only the days after it change', async () => {
      const leaver = await createLongServing('lockedmonth');
      const lockedUntil = await reporting.latestLockedDate(companyId);

      await expect(
        service.archive(
          leaver.id,
          owner.id,
          companyId,
          addDays(lockedUntil, -1),
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.archive(leaver.id, owner.id, companyId, lockedUntil),
      ).resolves.toMatchObject({ lastWorkingDay: lockedUntil });
    });

    it('closes only the days between the last working day and the first day back', async () => {
      const returner = await createLongServing('returner');
      const lastWorkingDay = addDays(today, -3);
      await service.archive(returner.id, owner.id, companyId, lastWorkingDay);

      await expect(
        service.unarchive(returner.id, companyId, lastWorkingDay),
      ).rejects.toThrow('after their last working day');

      const back = await service.unarchive(returner.id, companyId, yesterday);

      expect(back).toMatchObject({
        status: UserStatus.ACTIVE,
        lastWorkingDay: null,
      });
      expect(await spellsOf(returner.id)).toMatchObject([
        { lastWorkingDay, firstDayBack: yesterday },
      ]);
      await expect(
        capacity.assertEmployedOn(companyId, returner.id, lastWorkingDay),
      ).resolves.toBeUndefined();
      await expect(
        capacity.assertEmployedOn(companyId, returner.id, addDays(today, -2)),
      ).rejects.toThrow(BadRequestException);
      await expect(
        capacity.assertEmployedOn(companyId, returner.id, yesterday),
      ).resolves.toBeUndefined();
    });

    it('records no spell for someone back the day after their last working day', async () => {
      const mistake = await createLongServing('mistake');
      await service.archive(mistake.id, owner.id, companyId, yesterday);

      await service.unarchive(mistake.id, companyId, today);

      expect(await spellsOf(mistake.id)).toHaveLength(0);
    });

    it('ends their sessions', async () => {
      const leaver = await createUser('signedin', UserRole.EMPLOYEE);
      await dataSource.getRepository(AuthSession).save({
        userId: leaver.id,
        companyId,
        refreshHash: 'hash',
        expiresAt: new Date(Date.now() + 3_600_000),
      });

      await service.archive(leaver.id, owner.id, companyId, today);

      await expect(
        dataSource.getRepository(AuthSession).countBy({ userId: leaver.id }),
      ).resolves.toBe(0);
    });

    it('refuses changing their details or working hours until they are back', async () => {
      const leaver = await createUser('readonly', UserRole.EMPLOYEE);
      await service.archive(leaver.id, owner.id, companyId, today);

      await expect(
        service.updateUser(
          leaver.id,
          companyId,
          { position: 'Designer' },
          owner,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        capacity.setCapacity(
          companyId,
          leaver.id,
          1200,
          '2099-01-05',
          owner.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('keeps no spell for somebody deactivated before the day was recorded', async () => {
      const undated = await createUser('undated', UserRole.EMPLOYEE);
      await dataSource
        .getRepository(User)
        .update(undated.id, { status: UserStatus.DEACTIVATED });

      await service.unarchive(undated.id, companyId, today);

      expect(await spellsOf(undated.id)).toHaveLength(0);
    });
  });
  describe('working hours scheduled ahead', () => {
    const today = todayISODate(TIME_ZONE);
    const inTenDays = addDays(today, 10);
    const DAY_OF_SIX_HOURS = 30 * 60;
    const DAY_OF_SEVEN_HOURS = 35 * 60;

    it('lists a change that has not started, and cancels it back to the hours before', async () => {
      const person = await createUser('scheduled', UserRole.EMPLOYEE);
      const before = await capacity.minutesPerWeekOn(
        companyId,
        person.id,
        inTenDays,
      );
      await capacity.setCapacity(
        companyId,
        person.id,
        DAY_OF_SIX_HOURS,
        inTenDays,
        owner.id,
      );

      await expect(
        capacity.currentFor(companyId, person.id),
      ).resolves.toMatchObject({
        upcoming: { validFrom: inTenDays, minutesPerWeek: DAY_OF_SIX_HOURS },
      });

      const after = await capacity.cancelUpcoming(
        companyId,
        person.id,
        inTenDays,
      );

      expect(after.upcoming).toBeNull();
      await expect(
        capacity.minutesPerWeekOn(companyId, person.id, inTenDays),
      ).resolves.toBe(before);
    });

    it('keeps one scheduled change: a later one replaces it', async () => {
      const person = await createUser('replaced', UserRole.EMPLOYEE);
      const before = await capacity.minutesPerWeekOn(
        companyId,
        person.id,
        inTenDays,
      );
      const inTwentyDays = addDays(today, 20);
      await capacity.setCapacity(
        companyId,
        person.id,
        DAY_OF_SIX_HOURS,
        inTenDays,
        owner.id,
      );

      const result = await capacity.setCapacity(
        companyId,
        person.id,
        DAY_OF_SEVEN_HOURS,
        inTwentyDays,
        owner.id,
      );

      expect(result.upcoming).toEqual({
        validFrom: inTwentyDays,
        minutesPerWeek: DAY_OF_SEVEN_HOURS,
      });
      await expect(
        capacity.minutesPerWeekOn(companyId, person.id, inTenDays),
      ).resolves.toBe(before);
    });

    it('drops a scheduled change that a change from today makes the same', async () => {
      const person = await createUser('overtaken', UserRole.EMPLOYEE);
      await capacity.setCapacity(
        companyId,
        person.id,
        DAY_OF_SIX_HOURS,
        inTenDays,
        owner.id,
      );

      const result = await capacity.setCapacity(
        companyId,
        person.id,
        DAY_OF_SIX_HOURS,
        today,
        owner.id,
      );

      expect(result).toMatchObject({
        minutesPerWeek: DAY_OF_SIX_HOURS,
        upcoming: null,
      });
    });

    it('refuses to cancel a change already in force, or one that does not exist', async () => {
      const person = await createUser('inforce', UserRole.EMPLOYEE);
      await capacity.setCapacity(
        companyId,
        person.id,
        DAY_OF_SIX_HOURS,
        today,
        owner.id,
      );

      await expect(
        capacity.cancelUpcoming(companyId, person.id, today),
      ).rejects.toThrow(BadRequestException);
      await expect(
        capacity.cancelUpcoming(companyId, person.id, inTenDays),
      ).rejects.toThrow(NotFoundException);
    });

    it('removes a scheduled change when its day is set back to their own hours before', async () => {
      const person = await createUser('setback', UserRole.EMPLOYEE);
      await capacity.setCapacity(
        companyId,
        person.id,
        DAY_OF_SEVEN_HOURS,
        today,
        owner.id,
      );
      await capacity.setCapacity(
        companyId,
        person.id,
        DAY_OF_SIX_HOURS,
        inTenDays,
        owner.id,
      );

      const result = await capacity.setCapacity(
        companyId,
        person.id,
        DAY_OF_SEVEN_HOURS,
        inTenDays,
        owner.id,
      );

      expect(result.upcoming).toBeNull();
    });
  });
});
