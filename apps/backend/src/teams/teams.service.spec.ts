import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { todayISODate } from 'src/capacity/working-days.util';
import { timeZoneOnAnotherDay } from 'src/lib/testing/time-zones';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { TeamRole } from './enums/team-role.enum';
import { TeamStatus } from './enums/team-status.enum';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { InvitationStatus } from 'src/invitations/enums/invitation-status.enum';

import { TeamVisibilityService } from './team-visibility.service';
import { TeamsQuery } from './dtos/team.dto';
import { TeamsService } from './teams.service';

/**
 * These run against the development database, so they need the Docker stack:
 * `make test`. Everything is created under a throwaway company and deleted
 * afterwards.
 */

const RUN = Date.now();
const SLUG = `teams-service-test-${RUN}`;
const JOINED_AT = '2025-12-31';
const ADDITION_HEAD_START_MS = 300;

const TIME_ZONE = timeZoneOnAnotherDay();
const TODAY = todayISODate(TIME_ZONE);

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
      .save({ companyName: SLUG, slug: SLUG, timezone: TIME_ZONE });
    companyId = company.id;

    service = new TeamsService(
      dataSource.getRepository(Team),
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
      new TeamVisibilityService(
        dataSource.getRepository(TeamMembership),
        dataSource.getRepository(User),
      ),
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

    it('refuses a manager removing themselves or another manager', async () => {
      const own = await dataSource
        .getRepository(TeamMembership)
        .findOneByOrFail({ teamId: alpha, userId: alphaManager.id });
      const coManager = await addToTeam(alpha, employee, TeamRole.MANAGER);

      for (const membershipId of [own.id, coManager]) {
        await expect(
          service.removeMember(membershipId, companyId, alpha, alphaManager),
        ).rejects.toThrow(ForbiddenException);
      }

      await expect(activeMemberIds(alpha)).resolves.toEqual(
        [alphaManager.id, employee.id].sort(),
      );
    });

    it('lets an owner remove a team manager', async () => {
      const coManager = await addToTeam(alpha, employee, TeamRole.MANAGER);

      await service.removeMember(coManager, companyId, alpha, owner);

      await expect(activeMemberIds(alpha)).resolves.not.toContain(employee.id);
    });

    it('lets an owner remove from any team', async () => {
      const membershipId = await addToTeam(beta, employee);

      await service.removeMember(membershipId, companyId, beta, owner);

      await expect(activeMemberIds(beta)).resolves.not.toContain(employee.id);
    });

    it('closes leftAt on the company today and keeps the row', async () => {
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

    it('lets an owner add the person back the same day, as a new membership from today', async () => {
      const membershipId = await addToTeam(alpha, employee);
      await service.removeMember(membershipId, companyId, alpha, alphaManager);

      const readded = await service.addMember(alpha, companyId, {
        userId: employee.id,
        roleInTeam: TeamRole.MEMBER,
      });

      expect(readded.id).not.toBe(membershipId);
      expect(readded.joinedAt).toBe(TODAY);
      expect(readded.leftAt).toBeNull();
      await expect(activeMemberIds(alpha)).resolves.toContain(employee.id);
    });

    it('refuses adding someone already on the team', async () => {
      await addToTeam(alpha, employee);

      await expect(
        service.addMember(alpha, companyId, {
          userId: employee.id,
          roleInTeam: TeamRole.MEMBER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('who can manage a team', () => {
    afterEach(async () => {
      await dataSource
        .getRepository(TeamMembership)
        .delete({ userId: loneManager.id });
    });

    const addAs = (user: AuthUser, roleInTeam: TeamRole) =>
      service.addMember(alpha, companyId, {
        userId: user.id,
        roleInTeam,
      });

    it('lets a Manager be added as the team manager', async () => {
      const membership = await addAs(loneManager, TeamRole.MANAGER);

      expect(membership.roleInTeam).toBe(TeamRole.MANAGER);
    });

    it('refuses adding an employee as the team manager', async () => {
      await expect(addAs(employee, TeamRole.MANAGER)).rejects.toThrow(
        BadRequestException,
      );
      await expect(activeMemberIds(alpha)).resolves.not.toContain(employee.id);
    });

    it('refuses adding the owner as the team manager', async () => {
      await expect(addAs(owner, TeamRole.MANAGER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('still adds an employee as a member', async () => {
      const membership = await addAs(employee, TeamRole.MEMBER);

      expect(membership.roleInTeam).toBe(TeamRole.MEMBER);
    });

    it('refuses making an employee the team manager', async () => {
      const membershipId = await addToTeam(alpha, employee);

      await expect(
        service.updateMember(
          membershipId,
          companyId,
          { roleInTeam: TeamRole.MANAGER },
          alpha,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses changing a closed membership: someone coming back is added anew', async () => {
      const closed = await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: alpha,
        userId: loneManager.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: '2026-01-01',
        leftAt: '2026-02-01',
      });

      await expect(
        service.updateMember(
          closed.id,
          companyId,
          { roleInTeam: TeamRole.MANAGER },
          alpha,
        ),
      ).rejects.toThrow('This membership is already closed');
    });

    it('lets a Manager member be made the team manager', async () => {
      const membershipId = await addToTeam(alpha, loneManager);

      const updated = await service.updateMember(
        membershipId,
        companyId,
        { roleInTeam: TeamRole.MANAGER },
        alpha,
      );

      expect(updated.roleInTeam).toBe(TeamRole.MANAGER);
    });
  });

  describe('a deactivated person', () => {
    let gone: AuthUser;

    beforeAll(async () => {
      gone = await createUser('deactivated', UserRole.EMPLOYEE);
      await dataSource
        .getRepository(User)
        .update(gone.id, { status: UserStatus.DEACTIVATED });
    });

    it('cannot be added to a team', async () => {
      await expect(
        service.addMember(alpha, companyId, {
          userId: gone.id,
          roleInTeam: TeamRole.MEMBER,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(activeMemberIds(alpha)).resolves.not.toContain(gone.id);
    });

    it('stays on a team they were on, and can still be removed', async () => {
      const membershipId = await addToTeam(beta, gone);
      await expect(activeMemberIds(beta)).resolves.toContain(gone.id);

      await service.removeMember(membershipId, companyId, beta, owner);

      await expect(activeMemberIds(beta)).resolves.not.toContain(gone.id);
    });
  });

  describe("a team's former members", () => {
    it('are read by the owner on an active team, not by its manager', async () => {
      const membershipId = await addToTeam(alpha, employee);
      await service.removeMember(membershipId, companyId, alpha, owner);

      const userIdsAs = async (caller: AuthUser) =>
        (
          await service.getTeamForRead(alpha, companyId, caller)
        ).memberships?.map((membership) => membership.userId);

      await expect(userIdsAs(owner)).resolves.toContain(employee.id);
      await expect(userIdsAs(alphaManager)).resolves.not.toContain(employee.id);
    });
  });

  describe('the owner', () => {
    it('is never added to a team, as a member or its manager', async () => {
      for (const roleInTeam of [TeamRole.MEMBER, TeamRole.MANAGER]) {
        await expect(
          service.addMember(alpha, companyId, {
            userId: owner.id,
            roleInTeam,
          }),
        ).rejects.toThrow(BadRequestException);
      }
      await expect(activeMemberIds(alpha)).resolves.not.toContain(owner.id);
    });
  });

  describe('one member team per person', () => {
    const addAsMember = (teamId: string, user: AuthUser, extra = {}) =>
      service.addMember(teamId, companyId, {
        userId: user.id,
        roleInTeam: TeamRole.MEMBER,
        ...extra,
      });

    it('refuses adding a member of another team unless they leave it', async () => {
      await addToTeam(alpha, employee);

      await expect(addAsMember(beta, employee)).rejects.toThrow(
        ConflictException,
      );
      await expect(addAsMember(beta, employee)).rejects.toThrow(
        `already a member of "Alpha ${RUN}"`,
      );
      await expect(activeMemberIds(beta)).resolves.not.toContain(employee.id);
    });

    it('makes an addition wait for one under way elsewhere, then refuses it', async () => {
      // Another team's addition, holding the person as addMember does.
      const other = dataSource.createQueryRunner();
      await other.startTransaction();
      await other.manager.findOne(User, {
        where: { id: employee.id },
        lock: { mode: 'pessimistic_write' },
      });
      await other.manager.save(TeamMembership, {
        companyId,
        teamId: alpha,
        userId: employee.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: TODAY,
      });

      const addition = addAsMember(beta, employee);
      // Long enough for the addition to reach the person while the other is open.
      await new Promise((resolve) =>
        setTimeout(resolve, ADDITION_HEAD_START_MS),
      );
      await other.commitTransaction();
      await other.release();

      await expect(addition).rejects.toThrow(ConflictException);
    });

    it('moves them: the old membership ends the day the new one starts', async () => {
      const oldId = await addToTeam(alpha, employee);

      const moved = await addAsMember(beta, employee, {
        leaveCurrentTeam: true,
      });
      const old = await dataSource
        .getRepository(TeamMembership)
        .findOneByOrFail({ id: oldId });

      expect(moved.leftAt).toBeNull();
      expect(old.leftAt).toBe(TODAY);
      await expect(activeMemberIds(alpha)).resolves.not.toContain(employee.id);
      await expect(activeMemberIds(beta)).resolves.toContain(employee.id);
    });

    describe('for a Manager', () => {
      afterEach(async () => {
        await dataSource
          .getRepository(TeamMembership)
          .delete({ userId: loneManager.id });
      });

      it('lets them lead several teams and be a member of one', async () => {
        await addToTeam(alpha, loneManager);

        const leads = await service.addMember(beta, companyId, {
          userId: loneManager.id,
          roleInTeam: TeamRole.MANAGER,
        });

        expect(leads.leftAt).toBeNull();
        await expect(activeMemberIds(alpha)).resolves.toContain(loneManager.id);
      });

      it('refuses switching a team they lead to Member while they are a member elsewhere', async () => {
        await addToTeam(alpha, loneManager);
        const leads = await addToTeam(beta, loneManager, TeamRole.MANAGER);

        await expect(
          service.updateMember(
            leads,
            companyId,
            { roleInTeam: TeamRole.MEMBER },
            beta,
          ),
        ).rejects.toThrow(`already a member of "Alpha ${RUN}"`);
      });

      it('moves them when the switch says they leave their member team', async () => {
        await addToTeam(alpha, loneManager);
        const leads = await addToTeam(beta, loneManager, TeamRole.MANAGER);

        const switched = await service.updateMember(
          leads,
          companyId,
          { roleInTeam: TeamRole.MEMBER, leaveCurrentTeam: true },
          beta,
        );

        expect(switched.roleInTeam).toBe(TeamRole.MEMBER);
        await expect(activeMemberIds(alpha)).resolves.not.toContain(
          loneManager.id,
        );
      });
    });
  });

  describe('team search', () => {
    const foundNames = async (search: string, caller: AuthUser = owner) => {
      const { results } = await service.list(
        companyId,
        Object.assign(new TeamsQuery(), { pageSize: 50, search }),
        caller,
      );
      return results.map((team) => team.name);
    };

    it('matches part of a name, ignoring case', async () => {
      expect(await foundNames(`ALPHA ${RUN}`)).toEqual([`Alpha ${RUN}`]);
    });

    it('stays within the teams a manager leads', async () => {
      expect(await foundNames(`Beta ${RUN}`, alphaManager)).toEqual([]);
    });
  });

  describe('archiving', () => {
    const createInvitation = (teamId: string, name: string) =>
      dataSource.getRepository(Invitation).save({
        companyId,
        teamId,
        invitedById: owner.id,
        email: `${name}-${RUN}@teams-service.test`,
        role: UserRole.EMPLOYEE,
        status: InvitationStatus.PENDING,
        tokenHash: `${name}-${RUN}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      });

    const membershipsOf = (teamId: string) =>
      dataSource
        .getRepository(TeamMembership)
        .find({ where: { teamId }, order: { id: 'ASC' } });

    it('refuses while anyone is on the team or an invitation waits', async () => {
      const blockers: Record<string, (teamId: string) => Promise<unknown>> = {
        member: async (teamId) =>
          addToTeam(teamId, await createUser('on-member', UserRole.EMPLOYEE)),
        manager: async (teamId) =>
          addToTeam(
            teamId,
            await createUser('on-manager', UserRole.MANAGER),
            TeamRole.MANAGER,
          ),
        deactivated: async (teamId) => {
          const gone = await createUser('on-gone', UserRole.EMPLOYEE);
          await addToTeam(teamId, gone);
          await dataSource
            .getRepository(User)
            .update(gone.id, { status: UserStatus.DEACTIVATED });
        },
        invitation: (teamId) => createInvitation(teamId, 'on-invitation'),
      };

      for (const [name, putOnTeam] of Object.entries(blockers)) {
        const teamId = await createTeam(`not empty ${name}`);
        await putOnTeam(teamId);

        await expect(service.archiveTeam(teamId, companyId)).rejects.toThrow(
          ConflictException,
        );
      }
    });

    it('archives an empty team and changes nothing else; restoring undoes it', async () => {
      const teamId = await createTeam('emptied');
      const formerId = await addToTeam(teamId, employee);
      await service.removeMember(formerId, companyId, teamId, owner);
      const elsewhere = await createInvitation(beta, 'elsewhere');
      const history = await membershipsOf(teamId);

      const archived = await service.archiveTeam(teamId, companyId);
      expect(archived.status).toBe(TeamStatus.ARCHIVED);

      const restored = await service.unarchiveTeam(teamId, companyId);
      expect(restored.status).toBe(TeamStatus.ACTIVE);

      await expect(membershipsOf(teamId)).resolves.toEqual(history);
      await expect(
        dataSource
          .getRepository(Invitation)
          .findOneByOrFail({ id: elsewhere.id }),
      ).resolves.toMatchObject({ status: InvitationStatus.PENDING });
    });

    it('refuses changing an archived team', async () => {
      const teamId = await createTeam('read only');
      await service.archiveTeam(teamId, companyId);

      await expect(
        service.updateTeam(teamId, companyId, { name: `Renamed ${RUN}` }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addMember(teamId, companyId, {
          userId: employee.id,
          roleInTeam: TeamRole.MEMBER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('makes an addition wait for an archive under way, then refuses it', async () => {
      const teamId = await createTeam('archiving now');
      const archiving = dataSource.createQueryRunner();
      await archiving.startTransaction();
      await archiving.manager.update(
        Team,
        { id: teamId },
        { status: TeamStatus.ARCHIVED },
      );

      const addition = service.addMember(teamId, companyId, {
        userId: employee.id,
        roleInTeam: TeamRole.MEMBER,
      });
      // Long enough for the addition to reach the team while the archive is open.
      await new Promise((resolve) =>
        setTimeout(resolve, ADDITION_HEAD_START_MS),
      );
      await archiving.commitTransaction();
      await archiving.release();

      await expect(addition).rejects.toThrow(BadRequestException);
    });

    it('lists what is still on the team: open memberships and the invitation count', async () => {
      const teamId = await createTeam('impact');
      const manager = await createUser('impact-manager', UserRole.MANAGER);
      await addToTeam(teamId, manager, TeamRole.MANAGER);
      const formerId = await addToTeam(teamId, employee);
      await service.removeMember(formerId, companyId, teamId, owner);
      await createInvitation(teamId, 'impact-invitation');

      const impact = await service.getArchiveImpact(teamId, companyId);

      expect(
        impact.openMemberships.map((membership) => membership.userId),
      ).toEqual([manager.id]);
      expect(impact.pendingInvitationCount).toBe(1);
    });
  });

  describe('team names', () => {
    it('keeps the case it was given', async () => {
      const team = await service.createTeam(companyId, {
        name: `Delivery ${RUN}`,
      });

      expect(team.name).toBe(`Delivery ${RUN}`);
    });

    it('refuses a name that differs from an existing one only in case', async () => {
      await service.createTeam(companyId, { name: `Platform ${RUN}` });

      await expect(
        service.createTeam(companyId, { name: `PLATFORM ${RUN}` }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
