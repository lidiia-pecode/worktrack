import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, In, IsNull } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { TeamsService } from 'src/teams/teams.service';
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
const TIME_ZONE = timeZoneOnAnotherDay();

describe('UsersService scope', () => {
  let dataSource: DataSource;
  let service: UsersService;

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

    service = new UsersService(
      dataSource.getRepository(User),
      new TeamVisibilityService(
        dataSource.getRepository(TeamMembership),
        dataSource.getRepository(User),
      ),
      dataSource,
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

    await dataSource.getRepository(Company).delete({ slug: In([SLUG]) });
    await dataSource.destroy();
  });

  describe('list', () => {
    it('shows an owner the whole company', async () => {
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

  describe('createUser', () => {
    const payload = (name: string) => ({
      firstName: name,
      lastName: 'Created',
      email: `${name}-${RUN}@userscope.test`,
      password: 'Password123',
    });

    it('creates an employee straight into the team', async () => {
      const user = await service.createUser(companyId, {
        ...payload('created'),
        teamId: alphaId,
      });

      const memberships = await dataSource
        .getRepository(TeamMembership)
        .find({ where: { userId: user.id, leftAt: IsNull() } });

      expect(user.role).toBe(UserRole.EMPLOYEE);
      expect(memberships).toHaveLength(1);
      expect(memberships[0]).toMatchObject({
        teamId: alphaId,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: todayISODate(TIME_ZONE),
      });
    });

    it('refuses an employee with no team', async () => {
      await expect(
        service.createUser(companyId, payload('noteam')),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses a team on a manager', async () => {
      await expect(
        service.createUser(companyId, {
          ...payload('teammanager'),
          role: UserRole.MANAGER,
          teamId: alphaId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates nobody when the team is archived', async () => {
      const archived = await dataSource.getRepository(Team).save({
        companyId,
        name: `Archived ${RUN}`,
        status: TeamStatus.ARCHIVED,
      });
      const { email } = payload('archivedteam');

      await expect(
        service.createUser(companyId, {
          ...payload('archivedteam'),
          teamId: archived.id,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        dataSource.getRepository(User).existsBy({ email }),
      ).resolves.toBe(false);
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
});
