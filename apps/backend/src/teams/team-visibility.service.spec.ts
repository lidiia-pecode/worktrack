import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { TeamRole } from './enums/team-role.enum';
import { TeamVisibilityService } from './team-visibility.service';

/**
 * These run against the development database, so they need the Docker stack:
 * `make test`. They use real SQL on purpose — the rules being checked here are
 * about which rows come back, and a mocked query builder would happily pass
 * with a subquery that is subtly wrong.
 *
 * Everything is created under two throwaway companies and deleted afterwards.
 */

const RUN = Date.now();
const SLUG_A = `visibility-test-a-${RUN}`;
const SLUG_B = `visibility-test-b-${RUN}`;

const TODAY = '2026-01-01';
const YESTERDAY = '2025-12-31';

describe('TeamVisibilityService', () => {
  let dataSource: DataSource;
  let service: TeamVisibilityService;

  // Company A — the company under test.
  let companyA: string;
  let owner: AuthUser;
  let manager: AuthUser; // leads "Alpha"
  let loneManager: AuthUser; // has the MANAGER role but is on no team
  let nonLeadManager: AuthUser; // has the MANAGER role but is only a member of "Alpha"
  let member: AuthUser; // active member of "Alpha"
  let formerMember: AuthUser; // left "Alpha" (leftAt is set)
  let outsider: AuthUser; // in the company, on no team

  // Company B — exists only to prove tenants stay separate.
  let otherCompanyUser: AuthUser;

  const createCompany = async (slug: string): Promise<string> => {
    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: slug, slug });

    return company.id;
  };

  const createUser = async (
    companyId: string,
    name: string,
    role: UserRole,
  ): Promise<AuthUser> => {
    const email = `${name}-${RUN}@visibility.test`;
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
    });

    return { id: user.id, email, companyId, role };
  };

  const addToTeam = async (
    teamId: string,
    companyId: string,
    user: AuthUser,
    roleInTeam: TeamRole,
    leftAt: string | null = null,
  ): Promise<void> => {
    await dataSource.getRepository(TeamMembership).save({
      companyId,
      teamId,
      userId: user.id,
      roleInTeam,
      joinedAt: YESTERDAY,
      leftAt,
    });
  };

  /**
   * Runs `applyUserVisibility` over the user table and returns who survives it,
   * which is the question the service exists to answer.
   */
  const visibleUserIds = async (caller: AuthUser): Promise<string[]> => {
    const qb = dataSource
      .createQueryBuilder()
      .select('u.id', 'id')
      .from(User, 'u')
      .where('u.company_id = :tenantId', { tenantId: caller.companyId });

    service.applyUserVisibility(qb, 'u.id', caller);

    const rows = await qb.getRawMany<{ id: string }>();

    return rows.map((row) => row.id).sort();
  };

  const sorted = (...users: AuthUser[]): string[] =>
    users.map((user) => user.id).sort();

  beforeAll(async () => {
    // Same connection settings as the app, minus the query logging.
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    service = new TeamVisibilityService(
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
    );

    companyA = await createCompany(SLUG_A);
    const companyB = await createCompany(SLUG_B);

    owner = await createUser(companyA, 'owner', UserRole.OWNER);
    manager = await createUser(companyA, 'manager', UserRole.MANAGER);
    loneManager = await createUser(companyA, 'lonemanager', UserRole.MANAGER);
    nonLeadManager = await createUser(
      companyA,
      'nonleadmanager',
      UserRole.MANAGER,
    );
    member = await createUser(companyA, 'member', UserRole.EMPLOYEE);
    formerMember = await createUser(
      companyA,
      'formermember',
      UserRole.EMPLOYEE,
    );
    outsider = await createUser(companyA, 'outsider', UserRole.EMPLOYEE);
    otherCompanyUser = await createUser(
      companyB,
      'othercompany',
      UserRole.EMPLOYEE,
    );

    const alpha = await dataSource
      .getRepository(Team)
      .save({ companyId: companyA, name: `Alpha ${RUN}` });

    await addToTeam(alpha.id, companyA, manager, TeamRole.MANAGER);
    await addToTeam(alpha.id, companyA, nonLeadManager, TeamRole.MEMBER);
    await addToTeam(alpha.id, companyA, member, TeamRole.MEMBER);
    await addToTeam(alpha.id, companyA, formerMember, TeamRole.MEMBER, TODAY);
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    // Users, teams and memberships all cascade from the company.
    await dataSource
      .getRepository(Company)
      .delete({ slug: In([SLUG_A, SLUG_B]) });

    await dataSource.destroy();
  });

  describe('applyUserVisibility', () => {
    it('lets an owner see everyone in the company', async () => {
      await expect(visibleUserIds(owner)).resolves.toEqual(
        sorted(
          owner,
          manager,
          loneManager,
          nonLeadManager,
          member,
          formerMember,
          outsider,
        ),
      );
    });

    it('lets a manager see exactly the active members of teams they lead', async () => {
      await expect(visibleUserIds(manager)).resolves.toEqual(
        sorted(manager, nonLeadManager, member),
      );
    });

    it('shows a manager nobody when they lead no team', async () => {
      await expect(visibleUserIds(loneManager)).resolves.toEqual([]);
    });

    it('shows a manager nobody on a team they belong to but do not lead', async () => {
      await expect(visibleUserIds(nonLeadManager)).resolves.toEqual([]);
    });

    it('hides a member once their membership is closed', async () => {
      const visible = await visibleUserIds(manager);

      expect(visible).not.toContain(formerMember.id);
    });

    it('hides company members who are on no team from a manager', async () => {
      const visible = await visibleUserIds(manager);

      expect(visible).not.toContain(outsider.id);
      expect(visible).not.toContain(owner.id);
    });

    it('lets an employee see only themselves', async () => {
      await expect(visibleUserIds(member)).resolves.toEqual(sorted(member));
    });

    it('never reaches across companies', async () => {
      await expect(visibleUserIds(otherCompanyUser)).resolves.toEqual(
        sorted(otherCompanyUser),
      );
    });
  });

  describe('filterVisibleUserIds', () => {
    const candidates = (): string[] =>
      sorted(
        owner,
        manager,
        loneManager,
        nonLeadManager,
        member,
        formerMember,
        outsider,
        otherCompanyUser,
      );

    const filtered = async (
      caller: AuthUser,
      includeSelf = false,
    ): Promise<string[]> => {
      const visible = await service.filterVisibleUserIds(candidates(), caller, {
        includeSelf,
      });

      return [...visible].sort();
    };

    it("keeps every candidate for an owner, tenant scoping being the caller's job", async () => {
      await expect(filtered(owner)).resolves.toEqual(candidates());
    });

    it('keeps only the active members of teams a manager leads', async () => {
      await expect(filtered(manager)).resolves.toEqual(
        sorted(manager, nonLeadManager, member),
      );
    });

    it('agrees with applyUserVisibility', async () => {
      await expect(filtered(manager)).resolves.toEqual(
        await visibleUserIds(manager),
      );
    });

    it('keeps nobody for a manager who leads no team', async () => {
      await expect(filtered(loneManager)).resolves.toEqual([]);
    });

    it('keeps a manager who leads no team when self is included', async () => {
      await expect(filtered(loneManager, true)).resolves.toEqual([
        loneManager.id,
      ]);
    });

    it('keeps only themselves for an employee', async () => {
      await expect(filtered(member)).resolves.toEqual([member.id]);
    });

    it('returns nothing for an empty list', async () => {
      await expect(service.filterVisibleUserIds([], owner)).resolves.toEqual(
        new Set(),
      );
    });
  });

  describe('assertCanActForUser', () => {
    const wording = { action: 'assign', subject: 'projects' };

    const assertFor = (userId: string, caller: AuthUser): Promise<void> =>
      service.assertCanActForUser(userId, caller, wording);

    it('lets an owner act for anyone in their company', async () => {
      await expect(assertFor(outsider.id, owner)).resolves.toBeUndefined();
    });

    it('tells an owner a user in another company does not exist', async () => {
      await expect(assertFor(otherCompanyUser.id, owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lets a manager act for someone in a team they lead', async () => {
      await expect(assertFor(member.id, manager)).resolves.toBeUndefined();
    });

    it('refuses a manager for someone outside their teams', async () => {
      await expect(assertFor(outsider.id, manager)).rejects.toThrow(
        'You can only assign projects of users in teams you manage',
      );
    });

    it('lets an employee act for themselves', async () => {
      await expect(assertFor(member.id, member)).resolves.toBeUndefined();
    });

    it('refuses an employee for anyone else', async () => {
      await expect(assertFor(outsider.id, member)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('isUserInManagedTeams', () => {
    it('is true for an active member of a team the caller leads', async () => {
      await expect(
        service.isUserInManagedTeams(member.id, manager),
      ).resolves.toBe(true);
    });

    it('is false for someone whose membership has been closed', async () => {
      await expect(
        service.isUserInManagedTeams(formerMember.id, manager),
      ).resolves.toBe(false);
    });

    it('is false for someone in the company but on no team', async () => {
      await expect(
        service.isUserInManagedTeams(outsider.id, manager),
      ).resolves.toBe(false);
    });

    it('is false for every user when the caller leads no team', async () => {
      await expect(
        service.isUserInManagedTeams(member.id, loneManager),
      ).resolves.toBe(false);
    });

    it('is false for a teammate when the caller does not lead that team', async () => {
      await expect(
        service.isUserInManagedTeams(member.id, nonLeadManager),
      ).resolves.toBe(false);
    });

    it('is false for a user in another company', async () => {
      await expect(
        service.isUserInManagedTeams(otherCompanyUser.id, manager),
      ).resolves.toBe(false);
    });
  });
});
