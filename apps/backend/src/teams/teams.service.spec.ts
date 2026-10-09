import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { addDays, todayISODate } from 'src/capacity/working-days.util';
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
const TOMORROW = addDays(TODAY, 1);
const YESTERDAY = addDays(TODAY, -1);

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

    it('lets an owner add the person back the same day', async () => {
      const membershipId = await addToTeam(alpha, employee);
      await service.removeMember(membershipId, companyId, alpha, alphaManager);

      const readded = await service.addMember(alpha, companyId, {
        userId: employee.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: TODAY,
      });

      expect(readded.leftAt).toBeNull();
      await expect(activeMemberIds(alpha)).resolves.toContain(employee.id);
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
        joinedAt: TODAY,
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

    it('refuses reopening a manager membership for someone who is no longer a Manager', async () => {
      const closed = await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: alpha,
        userId: employee.id,
        roleInTeam: TeamRole.MANAGER,
        joinedAt: '2026-01-01',
        leftAt: '2026-02-01',
      });

      await expect(
        service.updateMember(closed.id, companyId, { leftAt: null }, alpha),
      ).rejects.toThrow(BadRequestException);

      await dataSource.getRepository(TeamMembership).delete({ id: closed.id });
    });

    it('refuses making an employee the team manager with an end date', async () => {
      const membershipId = await addToTeam(alpha, employee);

      await expect(
        service.updateMember(
          membershipId,
          companyId,
          { roleInTeam: TeamRole.MANAGER, leftAt: '2099-12-31' },
          alpha,
        ),
      ).rejects.toThrow(BadRequestException);
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
          joinedAt: TODAY,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(activeMemberIds(alpha)).resolves.not.toContain(gone.id);
    });

    it('cannot have a closed membership reopened', async () => {
      const closed = await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: alpha,
        userId: gone.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: '2026-01-01',
        leftAt: '2026-02-01',
      });

      await expect(
        service.updateMember(closed.id, companyId, { leftAt: null }, alpha),
      ).rejects.toThrow(BadRequestException);
    });

    it('stays on a team they were on, and can still be removed', async () => {
      const membershipId = await addToTeam(beta, gone);
      await expect(activeMemberIds(beta)).resolves.toContain(gone.id);

      await service.removeMember(membershipId, companyId, beta, owner);

      await expect(activeMemberIds(beta)).resolves.not.toContain(gone.id);
    });
  });

  describe('team search', () => {
    const foundNames = async (search: string, caller: AuthUser = owner) => {
      const { results } = await service.list(
        companyId,
        { offset: 0, limit: 50, search } as never,
        caller,
      );
      return results.map((team) => team.name);
    };

    it('matches part of a name, ignoring case', async () => {
      expect(await foundNames(`ALPHA ${RUN}`)).toEqual([`Alpha ${RUN}`]);
    });

    it('reads % and _ as plain characters', async () => {
      expect(await foundNames('%')).toEqual([]);
      expect(await foundNames('Alph_')).toEqual([]);
    });

    it('stays within the teams a manager leads', async () => {
      expect(await foundNames(`Beta ${RUN}`, alphaManager)).toEqual([]);
    });
  });

  describe('overlapping memberships', () => {
    const closedMembership = (joinedAt: string, leftAt: string) =>
      dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: alpha,
        userId: employee.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt,
        leftAt,
      });

    it('still refuses a membership that starts before another ended', async () => {
      await closedMembership(JOINED_AT, TODAY);

      await expect(
        service.addMember(alpha, companyId, {
          userId: employee.id,
          roleInTeam: TeamRole.MEMBER,
          joinedAt: YESTERDAY,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses moving a closed membership over another', async () => {
      const earlier = await closedMembership(JOINED_AT, YESTERDAY);
      await closedMembership(YESTERDAY, TODAY);

      await expect(
        service.updateMember(earlier.id, companyId, { leftAt: TODAY }, alpha),
      ).rejects.toThrow(ConflictException);
    });

    it('lets a closed membership end the day the next one starts', async () => {
      const earlier = await closedMembership(JOINED_AT, YESTERDAY);
      await closedMembership(TODAY, TOMORROW);

      const updated = await service.updateMember(
        earlier.id,
        companyId,
        { leftAt: TODAY },
        alpha,
      );

      expect(updated.leftAt).toBe(TODAY);
    });
  });

  describe('archiveTeam', () => {
    const createInvitation = (
      teamId: string,
      name: string,
      expiresAt = new Date(Date.now() + 3_600_000),
    ) =>
      dataSource.getRepository(Invitation).save({
        companyId,
        teamId,
        invitedById: owner.id,
        email: `${name}-${RUN}@teams-service.test`,
        role: UserRole.EMPLOYEE,
        status: InvitationStatus.PENDING,
        tokenHash: `${name}-${RUN}`,
        expiresAt,
      });

    const statusOf = async (id: string) =>
      (await dataSource.getRepository(Invitation).findOneByOrFail({ id }))
        .status;

    it('revokes the team pending invitations and says how many', async () => {
      const teamId = await createTeam('Archived with invitations');
      const first = await createInvitation(teamId, 'archive-first');
      const second = await createInvitation(teamId, 'archive-second');

      const archived = await service.archiveTeam(teamId, companyId);

      expect(archived.revokedInvitationCount).toBe(2);
      await expect(statusOf(first.id)).resolves.toBe(InvitationStatus.REVOKED);
      await expect(statusOf(second.id)).resolves.toBe(InvitationStatus.REVOKED);
    });

    it('leaves invitations into other teams alone', async () => {
      const teamId = await createTeam('Archived alone');
      const other = await createInvitation(beta, 'archive-other');

      const archived = await service.archiveTeam(teamId, companyId);

      expect(archived.revokedInvitationCount).toBe(0);
      await expect(statusOf(other.id)).resolves.toBe(InvitationStatus.PENDING);
    });
  });

  describe('archiving closes the team', () => {
    const visibility = () =>
      new TeamVisibilityService(
        dataSource.getRepository(TeamMembership),
        dataSource.getRepository(User),
      );

    const membershipOf = (id: string) =>
      dataSource.getRepository(TeamMembership).findOneByOrFail({ id });

    const saveMembership = (
      teamId: string,
      user: AuthUser,
      dates: { joinedAt: string; leftAt?: string | null },
      roleInTeam = TeamRole.MEMBER,
    ) =>
      dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId,
        userId: user.id,
        roleInTeam,
        leftAt: null,
        ...dates,
      });

    /** A team with its own Manager and one member, apart from the fixtures. */
    const teamWithPeople = async (name: string) => {
      const teamId = await createTeam(name);
      const manager = await createUser(`${name}-manager`, UserRole.MANAGER);
      const member = await createUser(`${name}-member`, UserRole.EMPLOYEE);
      const managerMembershipId = await addToTeam(
        teamId,
        manager,
        TeamRole.MANAGER,
      );
      const memberMembershipId = await addToTeam(teamId, member);

      return {
        teamId,
        manager,
        member,
        managerMembershipId,
        memberMembershipId,
      };
    };

    it('ends every open membership today and keeps the rows', async () => {
      const team = await teamWithPeople('closing');

      const archived = await service.archiveTeam(team.teamId, companyId);

      expect(archived.status).toBe(TeamStatus.ARCHIVED);
      expect(archived.memberships?.map((m) => m.leftAt)).toEqual([
        TODAY,
        TODAY,
      ]);

      await expect(
        membershipOf(team.managerMembershipId),
      ).resolves.toMatchObject({ leftAt: TODAY, joinedAt: JOINED_AT });
      await expect(
        membershipOf(team.memberMembershipId),
      ).resolves.toMatchObject({ leftAt: TODAY });
    });

    it('ends a membership that has not started on its start date', async () => {
      const teamId = await createTeam('future');
      const newcomer = await createUser('future-newcomer', UserRole.EMPLOYEE);
      const upcoming = await saveMembership(teamId, newcomer, {
        joinedAt: TOMORROW,
      });

      await service.archiveTeam(teamId, companyId);

      await expect(membershipOf(upcoming.id)).resolves.toMatchObject({
        leftAt: TOMORROW,
      });
    });

    it('brings a planned end forward and leaves ended ones alone', async () => {
      const teamId = await createTeam('planned end');
      const leaving = await createUser('planned-leaving', UserRole.EMPLOYEE);
      const gone = await createUser('planned-gone', UserRole.EMPLOYEE);
      const plannedEnd = await saveMembership(teamId, leaving, {
        joinedAt: JOINED_AT,
        leftAt: TOMORROW,
      });
      const alreadyEnded = await saveMembership(teamId, gone, {
        joinedAt: JOINED_AT,
        leftAt: YESTERDAY,
      });

      await service.archiveTeam(teamId, companyId);

      await expect(membershipOf(plannedEnd.id)).resolves.toMatchObject({
        leftAt: TODAY,
      });
      await expect(membershipOf(alreadyEnded.id)).resolves.toMatchObject({
        leftAt: YESTERDAY,
      });
    });

    it('takes away the former manager reach over the team', async () => {
      const team = await teamWithPeople('reach');

      await expect(
        visibility().isUserInManagedTeams(team.member.id, team.manager),
      ).resolves.toBe(true);

      await service.archiveTeam(team.teamId, companyId);

      await expect(
        visibility().getVisibleTeamIds(team.manager),
      ).resolves.not.toContain(team.teamId);
      await expect(
        visibility().isUserInManagedTeams(team.member.id, team.manager),
      ).resolves.toBe(false);
    });

    it('refuses changing an archived team', async () => {
      const team = await teamWithPeople('read only');
      await service.archiveTeam(team.teamId, companyId);

      await expect(
        service.updateTeam(team.teamId, companyId, { name: `Renamed ${RUN}` }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateMember(
          team.memberMembershipId,
          companyId,
          { joinedAt: YESTERDAY },
          team.teamId,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.removeMember(
          team.memberMembershipId,
          companyId,
          team.teamId,
          owner,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addMember(team.teamId, companyId, {
          userId: employee.id,
          roleInTeam: TeamRole.MEMBER,
          joinedAt: TODAY,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('makes an addition wait for an archive under way, then refuses it', async () => {
      const team = await teamWithPeople('archiving now');
      const archiving = dataSource.createQueryRunner();
      await archiving.startTransaction();
      await archiving.manager.update(
        Team,
        { id: team.teamId },
        { status: TeamStatus.ARCHIVED },
      );

      const addition = service.addMember(team.teamId, companyId, {
        userId: employee.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: TODAY,
      });
      // Long enough for the addition to reach the team while the archive is open.
      await new Promise((resolve) =>
        setTimeout(resolve, ADDITION_HEAD_START_MS),
      );
      await archiving.commitTransaction();
      await archiving.release();

      await expect(addition).rejects.toThrow(BadRequestException);
    });

    it('still shows an archived team its former members', async () => {
      const team = await teamWithPeople('history');
      await service.archiveTeam(team.teamId, companyId);

      const read = await service.getTeamById(team.teamId, companyId);

      expect(read.memberships?.map((m) => m.leftAt)).toEqual([TODAY, TODAY]);
    });

    it('restores the team with no members', async () => {
      const team = await teamWithPeople('restored');
      await service.archiveTeam(team.teamId, companyId);

      const restored = await service.unarchiveTeam(team.teamId, companyId);

      expect(restored.status).toBe(TeamStatus.ACTIVE);
      await expect(activeMemberIds(team.teamId)).resolves.toEqual([]);
    });
  });

  describe('getArchiveImpact', () => {
    it('lists the manager and the people left without a team', async () => {
      const teamId = await createTeam('impact');
      const manager = await createUser('impact-manager', UserRole.MANAGER);
      const teamless = await createUser('impact-teamless', UserRole.EMPLOYEE);
      const placed = await createUser('impact-placed', UserRole.EMPLOYEE);
      await addToTeam(teamId, manager, TeamRole.MANAGER);
      await addToTeam(teamId, teamless);
      await addToTeam(teamId, placed);
      await addToTeam(beta, placed);

      const impact = await service.getArchiveImpact(teamId, companyId);

      expect(impact.managers.map((user) => user.id)).toEqual([manager.id]);
      expect(impact.peopleLeftWithoutTeam.map((user) => user.id)).toEqual([
        teamless.id,
      ]);
    });

    it('counts someone as teamless when their other team is archived', async () => {
      const teamId = await createTeam('impact archived other');
      const otherTeamId = await createTeam('impact other');
      const person = await createUser('impact-other', UserRole.EMPLOYEE);
      await addToTeam(teamId, person);
      await addToTeam(otherTeamId, person);
      await dataSource
        .getRepository(Team)
        .update(otherTeamId, { status: TeamStatus.ARCHIVED });

      const impact = await service.getArchiveImpact(teamId, companyId);

      expect(impact.peopleLeftWithoutTeam.map((user) => user.id)).toEqual([
        person.id,
      ]);
    });

    it('leaves out people who are archived', async () => {
      const teamId = await createTeam('impact deactivated');
      const gone = await createUser('impact-gone', UserRole.EMPLOYEE);
      await addToTeam(teamId, gone);
      await dataSource
        .getRepository(User)
        .update(gone.id, { status: UserStatus.DEACTIVATED });

      const impact = await service.getArchiveImpact(teamId, companyId);

      expect(impact.peopleLeftWithoutTeam).toEqual([]);
    });

    it('refuses a team that is already archived', async () => {
      const teamId = await createTeam('impact already archived');
      await service.archiveTeam(teamId, companyId);

      await expect(service.getArchiveImpact(teamId, companyId)).rejects.toThrow(
        BadRequestException,
      );
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
