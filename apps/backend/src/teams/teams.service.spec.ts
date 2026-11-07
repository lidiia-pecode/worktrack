import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, IsNull, QueryFailedError } from 'typeorm';

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
import { PreviousManager, TeamsQuery } from './dtos/team.dto';
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

  let people = 0;
  // A fresh person each time, so a case owns everything it changes.
  const newPerson = (role: UserRole) =>
    createUser(`person-${(people += 1)}`, role);

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

    it('refuses a manager removing themselves', async () => {
      const own = await dataSource
        .getRepository(TeamMembership)
        .findOneByOrFail({ teamId: alpha, userId: alphaManager.id });

      await expect(
        service.removeMember(own.id, companyId, alpha, alphaManager),
      ).rejects.toThrow(ForbiddenException);

      await expect(activeMemberIds(alpha)).resolves.toContain(alphaManager.id);
    });

    it("lets an owner remove a team's manager, leaving it without one", async () => {
      const teamId = await createTeam('lead removed');
      const lead = await addToTeam(
        teamId,
        await createUser('removed-lead', UserRole.MANAGER),
        TeamRole.MANAGER,
      );

      await service.removeMember(lead, companyId, teamId, owner);

      await expect(activeMemberIds(teamId)).resolves.toEqual([]);
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
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("changing a team's manager", () => {
    const newManager = () => newPerson(UserRole.MANAGER);
    const roleOf = (membershipId: string) =>
      dataSource
        .getRepository(TeamMembership)
        .findOneByOrFail({ id: membershipId });

    it('promotes one of its members in place; the old manager stays as a member', async () => {
      const teamId = await createTeam('promoted');
      const oldLead = await addToTeam(
        teamId,
        await newManager(),
        TeamRole.MANAGER,
      );
      const member = await newManager();
      const memberId = await addToTeam(teamId, member);

      const lead = await service.changeManager(teamId, companyId, {
        userId: member.id,
        previousManager: PreviousManager.STAYS_AS_MEMBER,
      });

      expect(lead).toMatchObject({
        id: memberId,
        roleInTeam: TeamRole.MANAGER,
        joinedAt: JOINED_AT,
      });
      await expect(roleOf(oldLead)).resolves.toMatchObject({
        roleInTeam: TeamRole.MEMBER,
        leftAt: null,
      });
    });

    it('brings in a Manager in no team from today; the old manager leaves today', async () => {
      const teamId = await createTeam('replaced');
      const oldLead = await addToTeam(
        teamId,
        await newManager(),
        TeamRole.MANAGER,
      );
      const outsider = await newManager();

      const lead = await service.changeManager(teamId, companyId, {
        userId: outsider.id,
        previousManager: PreviousManager.LEAVES,
      });

      expect(lead).toMatchObject({
        userId: outsider.id,
        roleInTeam: TeamRole.MANAGER,
        joinedAt: TODAY,
      });
      await expect(roleOf(oldLead)).resolves.toMatchObject({
        roleInTeam: TeamRole.MANAGER,
        leftAt: TODAY,
      });
    });

    it('gives a team without a manager one, and replaces a deactivated one', async () => {
      const empty = await createTeam('leaderless');
      await expect(
        service.changeManager(empty, companyId, {
          userId: (await newManager()).id,
        }),
      ).resolves.toMatchObject({ roleInTeam: TeamRole.MANAGER });

      const teamId = await createTeam('lead gone');
      const gone = await newManager();
      await addToTeam(teamId, gone, TeamRole.MANAGER);
      await dataSource
        .getRepository(User)
        .update(gone.id, { status: UserStatus.DEACTIVATED });
      await expect(
        service.changeManager(teamId, companyId, {
          userId: (await newManager()).id,
          previousManager: PreviousManager.STAYS_AS_MEMBER,
        }),
      ).resolves.toMatchObject({ roleInTeam: TeamRole.MANAGER });
    });

    it('asks what happens to the current manager', async () => {
      const teamId = await createTeam('unsaid');
      await addToTeam(teamId, await newManager(), TeamRole.MANAGER);

      await expect(
        service.changeManager(teamId, companyId, {
          userId: (await newManager()).id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses someone in another team: they move first', async () => {
      const teamId = await createTeam('poaching');
      const elsewhere = await newManager();
      await addToTeam(beta, elsewhere);

      await expect(
        service.changeManager(teamId, companyId, { userId: elsewhere.id }),
      ).rejects.toThrow(`is in Beta ${RUN}; move them to this team first`);
      await expect(activeMemberIds(teamId)).resolves.toEqual([]);
    });

    it('makes an Employee of the team a Manager in the same change', async () => {
      const teamId = await createTeam('employee promoted');
      const member = await newPerson(UserRole.EMPLOYEE);
      await addToTeam(teamId, member);

      await service.changeManager(teamId, companyId, { userId: member.id });

      await expect(
        dataSource.getRepository(User).findOneByOrFail({ id: member.id }),
      ).resolves.toMatchObject({ role: UserRole.MANAGER });
    });

    it('refuses an Employee from outside the team, the owner and a deactivated Manager', async () => {
      const teamId = await createTeam('who leads');
      const outsider = await newPerson(UserRole.EMPLOYEE);
      const gone = await newManager();
      await dataSource
        .getRepository(User)
        .update(gone.id, { status: UserStatus.DEACTIVATED });

      for (const user of [outsider, owner, gone]) {
        await expect(
          service.changeManager(teamId, companyId, { userId: user.id }),
        ).rejects.toThrow(BadRequestException);
      }
      await expect(activeMemberIds(teamId)).resolves.toEqual([]);
    });

    it('waits while a manager invitation is pending', async () => {
      const teamId = await createTeam('invited lead');
      await dataSource.getRepository(Invitation).save({
        companyId,
        teamId,
        invitedById: owner.id,
        email: `invited-lead-${RUN}@teams-service.test`,
        role: UserRole.MANAGER,
        status: InvitationStatus.PENDING,
        tokenHash: `invited-lead-${RUN}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      });

      await expect(
        service.changeManager(teamId, companyId, {
          userId: (await newManager()).id,
        }),
      ).rejects.toThrow('revoke the invitation first');
    });
  });

  describe('the database', () => {
    it('holds one open membership per person and one manager per team', async () => {
      const lead = await newPerson(UserRole.MANAGER);
      await addToTeam(alpha, lead);

      await expect(addToTeam(beta, lead)).rejects.toThrow(QueryFailedError);
      await expect(
        addToTeam(alpha, await newPerson(UserRole.MANAGER), TeamRole.MANAGER),
      ).rejects.toThrow(QueryFailedError);
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
    it('is never added to a team', async () => {
      await expect(
        service.addMember(alpha, companyId, { userId: owner.id }),
      ).rejects.toThrow(BadRequestException);
      await expect(activeMemberIds(alpha)).resolves.not.toContain(owner.id);
    });
  });

  describe('one team per person', () => {
    const addAsMember = (teamId: string, user: AuthUser, extra = {}) =>
      service.addMember(teamId, companyId, {
        userId: user.id,
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

    it('adds a Manager as a member, and refuses moving one who leads their team', async () => {
      const manager = await newPerson(UserRole.MANAGER);
      await expect(addAsMember(alpha, manager)).resolves.toMatchObject({
        roleInTeam: TeamRole.MEMBER,
      });

      const teamId = await createTeam('led elsewhere');
      const lead = await newPerson(UserRole.MANAGER);
      await addToTeam(teamId, lead, TeamRole.MANAGER);
      await expect(
        addAsMember(alpha, lead, { leaveCurrentTeam: true }),
      ).rejects.toThrow(
        `leads led elsewhere ${RUN}; give it another manager first`,
      );
    });
  });

  describe('a team change on an earlier day', () => {
    // Three days back is never in a locked month: one locks a week after it ends.
    const THREE_DAYS_AGO = addDays(TODAY, -3);
    const wording = { action: 'change', subject: 'their time' };
    let visibility: TeamVisibilityService;

    const addAsMember = (teamId: string, extra = {}) =>
      service.addMember(teamId, companyId, {
        userId: employee.id,
        ...extra,
      });
    const membershipOf = (
      teamId: string,
      joinedAt: string,
      leftAt: string | null = null,
    ) =>
      dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId,
        userId: employee.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt,
        leftAt,
      });
    const canWriteOn = (manager: AuthUser, day: string) =>
      visibility.assertCanWriteUser(employee.id, manager, wording, {
        from: day,
        to: day,
      });

    beforeAll(async () => {
      visibility = new TeamVisibilityService(
        dataSource.getRepository(TeamMembership),
        dataSource.getRepository(User),
      );
      await dataSource
        .getRepository(User)
        .update(employee.id, { createdAt: new Date(`${JOINED_AT}T12:00:00Z`) });
    });

    it("splits a backdated move's days between the teams at the date", async () => {
      const oldId = await addToTeam(alpha, employee);

      await addAsMember(beta, { leaveCurrentTeam: true, date: THREE_DAYS_AGO });
      const old = await dataSource
        .getRepository(TeamMembership)
        .findOneByOrFail({ id: oldId });

      expect(old.leftAt).toBe(THREE_DAYS_AGO);
      await expect(
        canWriteOn(alphaManager, addDays(THREE_DAYS_AGO, -1)),
      ).resolves.toBeUndefined();
      await expect(canWriteOn(alphaManager, THREE_DAYS_AGO)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        canWriteOn(betaManager, THREE_DAYS_AGO),
      ).resolves.toBeUndefined();
    });

    it('refuses a day after today or in a locked month', async () => {
      await expect(
        addAsMember(beta, { date: addDays(TODAY, 1) }),
      ).rejects.toThrow(BadRequestException);
      await expect(addAsMember(beta, { date: '2025-06-02' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses a move dated before they joined the team they leave', async () => {
      await membershipOf(alpha, addDays(TODAY, -1));

      await expect(
        addAsMember(beta, { leaveCurrentTeam: true, date: THREE_DAYS_AGO }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses a day that would make them a member of two teams at once', async () => {
      await membershipOf(alpha, JOINED_AT, addDays(TODAY, -1));

      await expect(addAsMember(beta, { date: THREE_DAYS_AGO })).rejects.toThrow(
        ConflictException,
      );
    });

    it('ignores a membership that ended the day it began', async () => {
      // Added by mistake and removed the same day: no day was spent there.
      await membershipOf(alpha, TODAY, TODAY);

      await expect(
        addAsMember(beta, { date: THREE_DAYS_AGO }),
      ).resolves.toMatchObject({ joinedAt: THREE_DAYS_AGO });
    });

    it('lets only the owner date a removal back', async () => {
      const membershipId = await addToTeam(alpha, employee);

      await expect(
        service.removeMember(
          membershipId,
          companyId,
          alpha,
          alphaManager,
          THREE_DAYS_AGO,
        ),
      ).rejects.toThrow(ForbiddenException);

      await service.removeMember(
        membershipId,
        companyId,
        alpha,
        owner,
        THREE_DAYS_AGO,
      );
      await expect(
        dataSource
          .getRepository(TeamMembership)
          .findOneByOrFail({ id: membershipId }),
      ).resolves.toMatchObject({ leftAt: THREE_DAYS_AGO });
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
      });
      // Attached now, so a refusal before the commit below is still this
      // expectation's, not an unhandled rejection.
      const refused = expect(addition).rejects.toThrow(BadRequestException);
      // Long enough for the addition to reach the team while the archive is open.
      await new Promise((resolve) =>
        setTimeout(resolve, ADDITION_HEAD_START_MS),
      );
      await archiving.commitTransaction();
      await archiving.release();

      await refused;
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
