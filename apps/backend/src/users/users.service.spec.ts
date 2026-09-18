import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
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

describe('UsersService scope', () => {
  let dataSource: DataSource;
  let service: UsersService;

  let companyId: string;
  let owner: AuthUser;
  let manager: AuthUser; // leads "Alpha"
  let member: AuthUser; // in "Alpha"
  let outsider: AuthUser; // in the company, on no team of the manager's
  let leadNothing: AuthUser; // a manager who leads no team

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
      new TeamVisibilityService(dataSource.getRepository(TeamMembership)),
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
    leadNothing = await createUser('leadnothing', UserRole.MANAGER);

    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `Alpha ${RUN}` });

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
    it('stays company-wide for a manager, so they can still staff a team', async () => {
      const { results } = await service.listAssignable(companyId, PAGE);
      const ids = results.map((user) => user.id);

      expect(ids).toEqual(
        expect.arrayContaining([manager.id, member.id, outsider.id]),
      );
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
});
