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
import { UserRole } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Invitation } from './entities/invitation.entity';
import { InvitationStatus } from './enums/invitation-status.enum';
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
  ): Promise<string> => {
    const rawToken = randomBytes(32).toString('hex');

    await dataSource.getRepository(Invitation).save({
      companyId,
      teamId,
      invitedById: manager.id,
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
      ),
      stub({ sendInvitationEmail: jest.fn().mockResolvedValue(undefined) }),
      stub({
        createSession: jest.fn().mockResolvedValue({ access_token: '' }),
      }),
      stub({ hash: jest.fn().mockResolvedValue('hashed') }),
      stub({
        getOrThrow: (key: string) =>
          key === 'auth.invitation.expiresInMs' ? 3_600_000 : 'http://app.test',
      }),
      dataSource,
      teamVisibility,
      dataSource.getRepository(Team),
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
  });
});
