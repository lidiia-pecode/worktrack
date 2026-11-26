import 'reflect-metadata';
import { randomBytes } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import { openTestDataSource } from 'src/lib/testing/data-source';
import { buildServices } from 'src/lib/testing/services';
import { todayISODate } from 'src/capacity/working-days.util';
import { timeZoneOnAnotherDay } from 'src/lib/testing/time-zones';
import { waitUntilBlockedBy } from 'src/lib/testing/locks';
import { hashToken } from 'src/lib/utils/hash-token.util';
import { Company } from 'src/companies/entities/company.entity';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Invitation } from './entities/invitation.entity';
import { InvitationStatus } from './enums/invitation-status.enum';
import { AuthErrorCode } from 'src/auth/auth-error';
import { Notification } from 'src/notifications/entities/notification.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/enums/notification-type.enum';
import { InvitationsService } from './invitations.service';
import { UnusableInvitationCode } from './unusable-invitation';

/**
 * Accepting an invitation writes a user, a membership and the invitation
 * status in one transaction, so these run against the development database:
 * `make test`. Everything is created under a throwaway company.
 */

const RUN = Date.now();
const SLUG = `invitations-accept-test-${RUN}`;
const JOINED_AT = '2025-12-31';
const TIME_ZONE = timeZoneOnAnotherDay();
const TODAY = todayISODate(TIME_ZONE);

const stub = <T>(value: unknown): T => value as T;

describe('InvitationsService acceptance', () => {
  const hash = jest.fn().mockResolvedValue('hashed');
  let dataSource: DataSource;
  let service: InvitationsService;
  let teamVisibility: TeamVisibilityService;

  let companyId: string;
  let manager: AuthUser;

  let alpha: string;
  let archived: string;

  const createUser = async (
    name: string,
    role: UserRole,
  ): Promise<AuthUser> => {
    const email = `${name}-${RUN}@invitations-accept.test`;
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
    });

    return { id: user.id, email, companyId, role };
  };

  const createTeam = async (
    name: string,
    status: TeamStatus = TeamStatus.ACTIVE,
  ): Promise<string> => {
    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `${name} ${RUN}`, status });

    return team.id;
  };

  /** Returns the raw token the invitee would receive by email. */
  const createInvitation = async (
    email: string,
    teamId: string | null,
    role: UserRole = UserRole.EMPLOYEE,
    invitedById: string = manager.id,
  ): Promise<string> => {
    const rawToken = randomBytes(32).toString('hex');

    await dataSource.getRepository(Invitation).save({
      companyId,
      teamId,
      invitedById,
      email,
      role,
      status: InvitationStatus.PENDING,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    return rawToken;
  };

  const findUser = async (email: string): Promise<User | null> =>
    dataSource.getRepository(User).findOne({ where: { email } });

  const activeMemberships = async (userId: string): Promise<TeamMembership[]> =>
    dataSource
      .getRepository(TeamMembership)
      .find({ where: { userId, leftAt: IsNull() } });

  const teamMembershipCount = async (teamId: string): Promise<number> =>
    dataSource.getRepository(TeamMembership).countBy({ teamId });

  const visibleUserIds = async (caller: AuthUser): Promise<string[]> => {
    const qb = dataSource
      .createQueryBuilder()
      .select('u.id', 'id')
      .from(User, 'u')
      .where('u.company_id = :tenantId', { tenantId: caller.companyId });

    teamVisibility.applyUserVisibility(qb, 'u.id', caller, { onDays: 'today' });

    const rows = await qb.getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  };

  beforeAll(async () => {
    dataSource = await openTestDataSource();

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG, timezone: TIME_ZONE });
    companyId = company.id;

    const { users, ...services } = buildServices(dataSource);
    ({ teamVisibility } = services);

    service = new InvitationsService(
      dataSource.getRepository(Invitation),
      users,
      stub({ sendInvitationEmail: jest.fn().mockResolvedValue(undefined) }),
      stub({
        createSession: jest.fn().mockResolvedValue({ access_token: '' }),
      }),
      stub({ hash }),
      stub({ getOrThrow: () => 'http://app.test' }),
      dataSource,
      teamVisibility,
      dataSource.getRepository(Team),
      new NotificationsService(dataSource.getRepository(Notification)),
    );

    manager = await createUser('manager', UserRole.MANAGER);

    alpha = await createTeam('Alpha');
    archived = await createTeam('Archived', TeamStatus.ARCHIVED);

    await dataSource.getRepository(TeamMembership).save({
      companyId,
      teamId: alpha,
      userId: manager.id,
      roleInTeam: TeamRole.MANAGER,
      joinedAt: JOINED_AT,
      leftAt: null,
    });
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });

    await dataSource.destroy();
  });

  describe('completeWithPassword', () => {
    it('refuses a made-up link before hashing the password', async () => {
      hash.mockClear();

      await expect(
        service.completeWithPassword('made-up', 'password123', 'No', 'Body'),
      ).rejects.toMatchObject({
        response: { code: UnusableInvitationCode.NOT_FOUND },
      });
      expect(hash).not.toHaveBeenCalled();
    });

    it('puts the invited person in the team as a member', async () => {
      const email = `hire-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha);

      await service.completeWithPassword(token, 'password123', 'New', 'Hire');

      const user = await findUser(email);
      expect(user).not.toBeNull();

      const memberships = await activeMemberships(user!.id);
      expect(memberships).toHaveLength(1);
      expect(memberships[0].teamId).toBe(alpha);
      expect(memberships[0].roleInTeam).toBe(TeamRole.MEMBER);
      expect(memberships[0].joinedAt).toBe(TODAY);
    });

    it('makes an invited manager the manager of their team', async () => {
      const leaderless = await createTeam('Leaderless');
      const email = `lead-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, leaderless, UserRole.MANAGER);

      await service.completeWithPassword(token, 'password123', 'New', 'Lead');

      const user = await findUser(email);
      const memberships = await activeMemberships(user!.id);

      expect(user!.role).toBe(UserRole.MANAGER);
      expect(memberships).toHaveLength(1);
      expect(memberships[0].teamId).toBe(leaderless);
      expect(memberships[0].roleInTeam).toBe(TeamRole.MANAGER);
    });

    it('leaves an invited manager without a team when it was archived', async () => {
      const email = `lead-archived-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, archived, UserRole.MANAGER);

      await service.completeWithPassword(token, 'password123', 'Late', 'Lead');

      const user = await findUser(email);

      await expect(activeMemberships(user!.id)).resolves.toHaveLength(0);
    });

    it('puts them inside the inviting manager scope straight away', async () => {
      const email = `visible-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha);

      await service.completeWithPassword(
        token,
        'password123',
        'Visible',
        'Hire',
      );

      const user = await findUser(email);

      await expect(visibleUserIds(manager)).resolves.toContain(user!.id);
    });

    it('still accepts an invitation that carries no team', async () => {
      const email = `noteam-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, null);

      await service.completeWithPassword(token, 'password123', 'No', 'Team');

      const user = await findUser(email);
      expect(user).not.toBeNull();

      await expect(activeMemberships(user!.id)).resolves.toHaveLength(0);
    });

    it('creates the person without a membership when the team was archived', async () => {
      const email = `archived-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, archived);

      await service.completeWithPassword(
        token,
        'password123',
        'Archived',
        'Hire',
      );

      const user = await findUser(email);
      expect(user).not.toBeNull();

      await expect(activeMemberships(user!.id)).resolves.toHaveLength(0);

      const invitation = await dataSource
        .getRepository(Invitation)
        .findOneByOrFail({ email });

      expect(invitation.status).toBe(InvitationStatus.ACCEPTED);
    });

    it('rolls back the user and the membership together', async () => {
      const email = `rollback-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha);

      const membershipsBefore = await teamMembershipCount(alpha);

      // Fails after the membership is written, which is the only way to see
      // whether the two writes really share a transaction.
      const acceptance = jest
        .spyOn(
          service as unknown as { acceptInvitation: () => Promise<void> },
          'acceptInvitation',
        )
        .mockRejectedValue(new Error('acceptance failed'));

      await expect(
        service.completeWithPassword(token, 'password123', 'Rolled', 'Back'),
      ).rejects.toThrow('acceptance failed');

      acceptance.mockRestore();

      await expect(findUser(email)).resolves.toBeNull();
      await expect(teamMembershipCount(alpha)).resolves.toBe(membershipsBefore);

      const invitation = await dataSource
        .getRepository(Invitation)
        .findOneByOrFail({ email });

      expect(invitation.status).toBe(InvitationStatus.PENDING);
    });
  });

  describe('completeWithGoogle', () => {
    it('places the person in the team exactly as the password path does', async () => {
      const email = `google-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha);

      await service.completeWithGoogle(token, {
        email,
        firstName: 'Google',
        lastName: 'Hire',
        googleId: `google-${RUN}`,
      });

      const user = await findUser(email);
      const memberships = await activeMemberships(user!.id);

      expect(memberships).toHaveLength(1);
      expect(memberships[0].teamId).toBe(alpha);
      expect(memberships[0].roleInTeam).toBe(TeamRole.MEMBER);
      expect(memberships[0].joinedAt).toBe(TODAY);
    });

    const expectCode = (promise: Promise<unknown>, code: AuthErrorCode) =>
      expect(promise).rejects.toMatchObject({ response: { code } });

    it('refuses a Google account with another email address', async () => {
      const email = `google-other-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha);

      await expectCode(
        service.completeWithGoogle(token, {
          email: `someone-else-${RUN}@invitations-accept.test`,
          firstName: 'Google',
          lastName: 'Hire',
          googleId: `google-other-${RUN}`,
        }),
        AuthErrorCode.GOOGLE_EMAIL_MISMATCH,
      );
      await expect(findUser(email)).resolves.toBeNull();
    });

    it('asks for the password form when Google gives no family name', async () => {
      const email = `google-noname-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha);

      await expectCode(
        service.completeWithGoogle(token, {
          email,
          firstName: 'Mononym',
          lastName: ' ',
          googleId: `google-noname-${RUN}`,
        }),
        AuthErrorCode.GOOGLE_NAME_MISSING,
      );
    });
  });

  describe('a revoke and an acceptance at the same moment', () => {
    /**
     * Runs `second` while another transaction holds the invitation and has
     * moved it to `status`, then lets that one commit, as the first of two
     * clicks at the same moment would.
     */
    const whileHeldAs = async <T>(
      invitationId: string,
      status: InvitationStatus,
      second: () => Promise<T>,
    ): Promise<PromiseSettledResult<T>> => {
      const holder = dataSource.createQueryRunner();
      await holder.connect();
      await holder.startTransaction();

      try {
        await holder.manager.update(Invitation, invitationId, {
          status,
          ...(status === InvitationStatus.ACCEPTED
            ? { acceptedAt: new Date() }
            : { revokedAt: new Date() }),
        });
        const pending = Promise.allSettled([second()]);
        await waitUntilBlockedBy(dataSource, holder);
        await holder.commitTransaction();

        const [result] = await pending;
        return result;
      } finally {
        if (holder.isTransactionActive) await holder.rollbackTransaction();
        await holder.release();
      }
    };

    const invitationFor = (email: string) =>
      dataSource.getRepository(Invitation).findOneByOrFail({ email });

    it('refuses a revoke that comes second, and keeps the acceptance', async () => {
      const email = `race-revoke-${RUN}@invitations-accept.test`;
      await createInvitation(email, alpha);
      const { id } = await invitationFor(email);

      const revoke = await whileHeldAs(id, InvitationStatus.ACCEPTED, () =>
        service.revoke(id, manager),
      );

      expect(revoke).toMatchObject({
        status: 'rejected',
        reason: expect.any(NotFoundException) as unknown,
      });
      await expect(invitationFor(email)).resolves.toMatchObject({
        status: InvitationStatus.ACCEPTED,
      });
    });

    it('refuses an acceptance that comes second, and creates nobody', async () => {
      const email = `race-accept-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha);
      const { id } = await invitationFor(email);

      const acceptance = await whileHeldAs(id, InvitationStatus.REVOKED, () =>
        service.completeWithPassword(token, 'Secret123', 'Ruby', 'Lane'),
      );

      expect(acceptance).toMatchObject({
        status: 'rejected',
        reason: { response: { code: UnusableInvitationCode.REVOKED } },
      });
      await expect(findUser(email)).resolves.toBeNull();
    });
  });

  describe('the joined notification', () => {
    let notifications: NotificationsService;

    beforeAll(() => {
      notifications = new NotificationsService(
        dataSource.getRepository(Notification),
      );
    });

    const notificationsAbout = (userId: string) =>
      dataSource
        .getRepository(Notification)
        .find({ where: { subjectUserId: userId } });

    it('tells the inviter when someone joins by password', async () => {
      const email = `notify-password-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha);

      await service.completeWithPassword(token, 'Secret123', 'Emma', 'Clarke');

      const joined = await findUser(email);
      const [notification] = await notificationsAbout(joined!.id);

      expect(notification).toMatchObject({
        recipientId: manager.id,
        type: NotificationType.INVITATION_ACCEPTED,
        readAt: null,
      });
    });

    it('tells the inviter when someone joins with Google', async () => {
      const email = `notify-google-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha);

      await service.completeWithGoogle(token, {
        email,
        firstName: 'Liam',
        lastName: 'Turner',
        googleId: `notify-google-${RUN}`,
      });

      const joined = await findUser(email);

      await expect(notificationsAbout(joined!.id)).resolves.toHaveLength(1);
    });

    /** A team led by `managerId`, open or closed, with its own invitation. */
    const leadTeam = async (
      name: string,
      managerId: string,
      leftAt: string | null = null,
    ): Promise<string> => {
      const teamId = await createTeam(name);
      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId,
        userId: managerId,
        roleInTeam: TeamRole.MANAGER,
        joinedAt: JOINED_AT,
        leftAt,
      });
      return teamId;
    };

    const joinBy = async (
      name: string,
      teamId: string | null,
      invitedById: string,
      role: UserRole = UserRole.EMPLOYEE,
    ): Promise<string[]> => {
      const email = `notify-${name}-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, teamId, role, invitedById);
      await service.completeWithPassword(token, 'Secret123', 'Noah', 'Hughes');

      const joined = await findUser(email);
      const notices = await notificationsAbout(joined!.id);
      return notices.map((notice) => notice.recipientId);
    };

    it('tells the owner who invited, not the team manager', async () => {
      const owner = await createUser('notifyowner', UserRole.OWNER);

      await expect(joinBy('by-owner', alpha, owner.id)).resolves.toEqual([
        owner.id,
      ]);
      await expect(
        joinBy('manager-by-owner', null, owner.id, UserRole.MANAGER),
      ).resolves.toEqual([owner.id]);
    });

    it('tells the current manager once the inviter no longer leads the team', async () => {
      const formerLead = await createUser('formerlead', UserRole.MANAGER);
      const team = await leadTeam('Handed over', formerLead.id, TODAY);
      const currentLead = await createUser('currentlead', UserRole.MANAGER);
      await dataSource.getRepository(TeamMembership).save({
        companyId,
        teamId: team,
        userId: currentLead.id,
        roleInTeam: TeamRole.MANAGER,
        joinedAt: TODAY,
      });

      await expect(joinBy('handed-over', team, formerLead.id)).resolves.toEqual(
        [currentLead.id],
      );
    });

    it('tells nobody when the team has no active manager', async () => {
      const archivedLead = await createUser('archivedlead', UserRole.MANAGER);
      const team = await leadTeam('Archived lead', archivedLead.id);
      await dataSource
        .getRepository(User)
        .update(archivedLead.id, { status: UserStatus.DEACTIVATED });

      await expect(joinBy('no-lead', team, archivedLead.id)).resolves.toEqual(
        [],
      );
    });

    it('lists only the caller’s own, and marks them read', async () => {
      const bystander = await createUser('bystander', UserRole.MANAGER);

      const before = await notifications.listForUser(manager);
      expect(before.unreadCount).toBeGreaterThan(0);
      expect(before.items[0].subjectUser?.firstName).toBeDefined();

      await expect(notifications.listForUser(bystander)).resolves.toEqual({
        items: [],
        unreadCount: 0,
      });

      const shownIds = before.items.map((item) => item.id);

      // Someone else's ids change nothing.
      await notifications.markRead(bystander, shownIds);
      await expect(notifications.listForUser(manager)).resolves.toMatchObject({
        unreadCount: before.unreadCount,
      });

      await notifications.markRead(manager, shownIds);
      await expect(notifications.listForUser(manager)).resolves.toMatchObject({
        unreadCount: 0,
      });
    });
  });
});
