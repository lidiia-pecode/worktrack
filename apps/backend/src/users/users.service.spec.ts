import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { ReportingService } from 'src/reporting/reporting.service';
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { todayISODate } from 'src/capacity/working-days.util';
import { timeZoneOnAnotherDay } from 'src/lib/testing/time-zones';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { User } from './entities/user.entity';
import { UserRole, UserStatus } from './enums/user-role.enum';
import { UsersService } from './users.service';

/**
 * Runs against the development database, so it needs the Docker stack. The
 * rule under test is who appears in a manager's user list, and a mocked
 * repository would pass whatever the query happened to be.
 */

const RUN = Date.now();
const SLUG = `users-scope-test-${RUN}`;
const PAGE = { offset: 0, limit: 50 } as never;
const searchFor = (search: string) =>
  ({ offset: 0, limit: 50, search }) as never;
const TIME_ZONE = timeZoneOnAnotherDay();

describe('UsersService scope', () => {
  let dataSource: DataSource;
  let service: UsersService;
  let capacity: CapacityService;

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
    capacity = new CapacityService(
      dataSource.getRepository(UserCapacity),
      dataSource.getRepository(Company),
      dataSource.getRepository(User),
      new ReportingService(
        dataSource.getRepository(ReportingPeriod),
        dataSource.getRepository(Company),
        teamVisibility,
      ),
    );
    service = new UsersService(
      dataSource.getRepository(User),
      teamVisibility,
      dataSource,
      capacity,
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
    await dataSource.getRepository(Project).delete({ companyId });
    await dataSource.getRepository(Company).delete({ slug: In([SLUG]) });
    await dataSource.destroy();
  });

  describe('list', () => {
    it('shows an owner the whole company except owners', async () => {
      const ids = await listedIds(owner);

      expect(ids).toEqual(
        expect.arrayContaining([
          manager.id,
          member.id,
          outsider.id,
          leadNothing.id,
        ]),
      );
      expect(ids).not.toContain(owner.id);
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

    it('reads % and _ as plain characters', async () => {
      expect(await foundIds('%')).toEqual([]);
      expect(await foundIds('memb_r')).toEqual([]);
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
    let betaId: string;

    const rowOf = async (caller: AuthUser, userId: string) => {
      const { results } = await service.list(companyId, PAGE, caller);
      return results.find((user) => user.id === userId)!;
    };

    beforeAll(async () => {
      const beta = await dataSource
        .getRepository(Team)
        .save({ companyId, name: `Beta ${RUN}` });
      betaId = beta.id;

      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: betaId,
        userId: member.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: '2026-01-01',
      });

      for (const status of [ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED]) {
        await dataSource.getRepository(Project).save({
          companyId,
          name: `${status} project ${RUN}`,
          status,
          users: [{ id: member.id }],
        });
      }
    });

    it('names every open team for an owner', async () => {
      const row = await rowOf(owner, member.id);

      expect(row.teams.map((team) => team.id).sort()).toEqual(
        [alphaId, betaId].sort(),
      );
    });

    it('names only the teams a manager leads', async () => {
      const row = await rowOf(manager, member.id);

      expect(row.teams).toEqual([{ id: alphaId, name: `Alpha ${RUN}` }]);
    });

    it('gives a person on no team an empty list', async () => {
      expect((await rowOf(owner, outsider.id)).teams).toEqual([]);
    });

    it('counts active projects only', async () => {
      expect((await rowOf(owner, member.id)).projectsCount).toBe(1);
      expect((await rowOf(owner, outsider.id)).projectsCount).toBe(0);
    });

    it("gives an owner today's weekly capacity", async () => {
      const row = await rowOf(owner, member.id);

      expect(row.weeklyMinutes).toBe(
        await capacity.defaultMinutesPerWeek(companyId),
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
        dataSource.getRepository(TeamMembership),
        dataSource.getRepository(User),
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
      await teams.addMember(alphaId, companyId, {
        userId: leaver.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: todayISODate(TIME_ZONE),
      });

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
        UserRole.OWNER,
      );

    it('is allowed for a Manager who manages no team', async () => {
      const teamless = await createUser('teamlessmanager', UserRole.MANAGER);

      const updated = await demote(teamless);

      expect(updated.role).toBe(UserRole.EMPLOYEE);
    });

    it('is refused while they manage a team, naming every team', async () => {
      const leader = await createUser('twoteamleader', UserRole.MANAGER);
      await leadTeam(leader, 'Gamma');
      await leadTeam(leader, 'Delta');

      const refusal = demote(leader);

      await expect(refusal).rejects.toThrow(BadRequestException);
      await expect(refusal).rejects.toThrow(
        new RegExp(`Delta ${RUN}, Gamma ${RUN}`),
      );
    });

    it('leaves the role and memberships untouched when refused', async () => {
      const leader = await createUser('keptleader', UserRole.MANAGER);
      const membership = await leadTeam(leader, 'Epsilon');

      await expect(demote(leader)).rejects.toThrow(BadRequestException);

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

    it('is refused for making a team manager an Owner too', async () => {
      const leader = await createUser('ownerbound', UserRole.MANAGER);
      await leadTeam(leader, 'Theta');

      await expect(
        service.updateUser(
          leader.id,
          companyId,
          { role: UserRole.OWNER },
          UserRole.OWNER,
        ),
      ).rejects.toThrow(BadRequestException);
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

      for (let offset = 0; offset < count; offset += PAGE_SIZE) {
        const page = await fetchPage({
          offset,
          limit: PAGE_SIZE,
        } as PaginationQuery);
        count = page.count;
        ids.push(...page.results.map((user) => user.id));
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
});
