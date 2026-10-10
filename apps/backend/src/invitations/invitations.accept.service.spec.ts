import 'reflect-metadata';
import { createHash, randomBytes } from 'crypto';
import { DataSource, IsNull } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { todayISODate } from 'src/capacity/working-days.util';
import { timeZoneOnAnotherDay } from 'src/lib/testing/time-zones';
import { Company } from 'src/companies/entities/company.entity';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';
import { CapacityService } from 'src/capacity/capacity.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Invitation } from './entities/invitation.entity';
import { InvitationStatus } from './enums/invitation-status.enum';
import { AuthErrorCode } from 'src/auth/auth-error';
import { Notification } from 'src/notifications/entities/notification.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/enums/notification-type.enum';
import { InvitationsService } from './invitations.service';

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
      tokenHash: createHash('sha256').update(rawToken).digest('hex'),
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

    teamVisibility.applyUserVisibility(qb, 'u.id', caller);

    const rows = await qb.getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  };

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG, timezone: TIME_ZONE });
    companyId = company.id;

    teamVisibility = new TeamVisibilityService(
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
    );

    service = new InvitationsService(
      dataSource.getRepository(Invitation),
      new UsersService(
        dataSource.getRepository(User),
        teamVisibility,
        dataSource,
        stub<CapacityService>({}),
      ),
      stub({ sendInvitationEmail: jest.fn().mockResolvedValue(undefined) }),
      stub({
        createSession: jest.fn().mockResolvedValue({ access_token: '' }),
      }),
      stub({ hash: jest.fn().mockResolvedValue('hashed') }),
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
      const email = `lead-${RUN}@invitations-accept.test`;
      const token = await createInvitation(email, alpha, UserRole.MANAGER);

      await service.completeWithPassword(token, 'password123', 'New', 'Lead');

      const user = await findUser(email);
      const memberships = await activeMemberships(user!.id);

      expect(user!.role).toBe(UserRole.MANAGER);
      expect(memberships).toHaveLength(1);
      expect(memberships[0].teamId).toBe(alpha);
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

    it('tells nobody when the inviter has been archived', async () => {
      const archivedInviter = await createUser(
        'archivedinviter',
        UserRole.MANAGER,
      );
      await dataSource
        .getRepository(User)
        .update(archivedInviter.id, { status: UserStatus.DEACTIVATED });

      const email = `notify-archived-${RUN}@invitations-accept.test`;
      const token = await createInvitation(
        email,
        null,
        UserRole.MANAGER,
        archivedInviter.id,
      );

      await service.completeWithPassword(
        token,
        'Secret123',
        'Olivia',
        'Brooks',
      );

      const joined = await findUser(email);

      await expect(notificationsAbout(joined!.id)).resolves.toHaveLength(0);
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

      await notifications.markAllRead(bystander);
      await expect(notifications.listForUser(manager)).resolves.toMatchObject({
        unreadCount: before.unreadCount,
      });

      await notifications.markAllRead(manager);
      await expect(notifications.listForUser(manager)).resolves.toMatchObject({
        unreadCount: 0,
      });
    });
  });
});
