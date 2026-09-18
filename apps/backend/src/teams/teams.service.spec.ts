import 'reflect-metadata';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { TeamRole } from './enums/team-role.enum';
import { TeamVisibilityService } from './team-visibility.service';
import { TeamsService } from './teams.service';

/**
 * These run against the development database, so they need the Docker stack:
 * `make test`. Everything is created under a throwaway company and deleted
 * afterwards.
 */

const RUN = Date.now();
const SLUG = `teams-service-test-${RUN}`;
const JOINED_AT = '2025-12-31';

const TODAY = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

describe('TeamsService', () => {
  let dataSource: DataSource;
  let service: TeamsService;

  let companyId: string;
  let owner: AuthUser;
  let alphaManager: AuthUser; // leads "Alpha"
  let betaManager: AuthUser; // leads "Beta"
  let loneManager: AuthUser; // has the MANAGER role but is on no team
  let employee: AuthUser;

  let alpha: string;
  let beta: string;

  const createUser = async (
    name: string,
    role: UserRole,
  ): Promise<AuthUser> => {
    const email = `${name}-${RUN}@teams-service.test`;
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
    });

    return { id: user.id, email, companyId, role };
  };

  const createTeam = async (name: string): Promise<string> => {
    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `${name} ${RUN}` });

    return team.id;
  };

  const addToTeam = async (
    teamId: string,
    user: AuthUser,
    roleInTeam: TeamRole = TeamRole.MEMBER,
  ): Promise<string> => {
    const membership = await dataSource.getRepository(TeamMembership).save({
      companyId,
      teamId,
      userId: user.id,
      roleInTeam,
      joinedAt: JOINED_AT,
      leftAt: null,
    });

    return membership.id;
  };

  const activeMemberIds = async (teamId: string): Promise<string[]> => {
    const memberships = await dataSource.getRepository(TeamMembership).find({
      select: ['userId'],
      where: { teamId, leftAt: IsNull() },
    });

    return memberships.map((membership) => membership.userId).sort();
  };

  beforeAll(async () => {
    // Same connection settings as the app, minus the query logging.
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;

    service = new TeamsService(
      dataSource.getRepository(Team),
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
      new TeamVisibilityService(dataSource.getRepository(TeamMembership)),
      dataSource,
    );

    owner = await createUser('owner', UserRole.OWNER);
    alphaManager = await createUser('alphamanager', UserRole.MANAGER);
    betaManager = await createUser('betamanager', UserRole.MANAGER);
    loneManager = await createUser('lonemanager', UserRole.MANAGER);
    employee = await createUser('employee', UserRole.EMPLOYEE);

    alpha = await createTeam('Alpha');
    beta = await createTeam('Beta');

    await addToTeam(alpha, alphaManager, TeamRole.MANAGER);
    await addToTeam(beta, betaManager, TeamRole.MANAGER);
  });

  afterEach(async () => {
    await dataSource
      .getRepository(TeamMembership)
      .delete({ userId: employee.id });
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    // Users, teams and memberships all cascade from the company.
    await dataSource.getRepository(Company).delete({ slug: SLUG });

    await dataSource.destroy();
  });

  describe('removeMember', () => {
    it('lets a manager remove someone from a team they lead', async () => {
      const membershipId = await addToTeam(alpha, employee);

      await service.removeMember(membershipId, companyId, alpha, alphaManager);

      await expect(activeMemberIds(alpha)).resolves.not.toContain(employee.id);
    });

    it('refuses a manager on a team they do not lead', async () => {
      const membershipId = await addToTeam(beta, employee);

      await expect(
        service.removeMember(membershipId, companyId, beta, alphaManager),
      ).rejects.toThrow(ForbiddenException);

      await expect(activeMemberIds(beta)).resolves.toContain(employee.id);
    });

    it('refuses a manager who leads no team', async () => {
      const membershipId = await addToTeam(alpha, employee);

      await expect(
        service.removeMember(membershipId, companyId, alpha, loneManager),
      ).rejects.toThrow(ForbiddenException);

      await expect(activeMemberIds(alpha)).resolves.toContain(employee.id);
    });

    it('lets an owner remove from any team', async () => {
      const membershipId = await addToTeam(beta, employee);

      await service.removeMember(membershipId, companyId, beta, owner);

      await expect(activeMemberIds(beta)).resolves.not.toContain(employee.id);
    });

    it('closes leftAt and keeps the row', async () => {
      const membershipId = await addToTeam(alpha, employee);

      await service.removeMember(membershipId, companyId, alpha, alphaManager);

      const membership = await dataSource
        .getRepository(TeamMembership)
        .findOneByOrFail({ id: membershipId });

      expect(membership.leftAt).toBe(TODAY);
      expect(membership.joinedAt).toBe(JOINED_AT);
    });

    it('refuses to close the same membership twice', async () => {
      const membershipId = await addToTeam(alpha, employee);

      await service.removeMember(membershipId, companyId, alpha, alphaManager);

      await expect(
        service.removeMember(membershipId, companyId, alpha, alphaManager),
      ).rejects.toThrow(BadRequestException);
    });

    it('lets an owner add the person back afterwards', async () => {
      const membershipId = await addToTeam(alpha, employee);
      await service.removeMember(membershipId, companyId, alpha, alphaManager);

      const readded = await service.addMember(alpha, companyId, {
        userId: employee.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: TOMORROW,
      });

      expect(readded.leftAt).toBeNull();
      await expect(activeMemberIds(alpha)).resolves.toContain(employee.id);
    });
  });
});
