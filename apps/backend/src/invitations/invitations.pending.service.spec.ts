import 'reflect-metadata';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Invitation } from './entities/invitation.entity';
import { InvitationStatus } from './enums/invitation-status.enum';
import { InvitationsService } from './invitations.service';

/**
 * Sending, resending and revoking all come down to which invitation rows are
 * left pending, so these run against the development database: `make test`.
 * Everything is created under a throwaway company.
 */

const RUN = Date.now();
const SLUG = `invitations-pending-test-${RUN}`;

const stub = <T>(value: unknown): T => value as T;

describe('InvitationsService pending invitations', () => {
  let dataSource: DataSource;
  let service: InvitationsService;
  let sendInvitationEmail: jest.Mock;

  let companyId: string;
  let owner: AuthUser;
  let alphaManager: AuthUser;
  let betaManager: AuthUser;

  let alpha: string;
  let beta: string;

  let emailCount = 0;
  const nextEmail = () =>
    `invitee-${++emailCount}-${RUN}@invitations-pending.test`;

  const createUser = async (
    name: string,
    role: UserRole,
  ): Promise<AuthUser> => {
    const email = `${name}-${RUN}@invitations-pending.test`;
    const user = await dataSource.getRepository(User).save({
      companyId,
      role,
      firstName: name,
      lastName: 'Test',
      email,
    });

    return { id: user.id, email, companyId, role };
  };

  const createLedTeam = async (
    name: string,
    manager: AuthUser,
  ): Promise<string> => {
    const team = await dataSource
      .getRepository(Team)
      .save({ companyId, name: `${name} ${RUN}` });

    await dataSource.getRepository(TeamMembership).save({
      companyId,
      teamId: team.id,
      userId: manager.id,
      roleInTeam: TeamRole.MANAGER,
      joinedAt: '2025-12-31',
      leftAt: null,
    });

    return team.id;
  };

  const invite = (
    caller: AuthUser,
    email: string,
    teamId?: string,
    role: UserRole = UserRole.EMPLOYEE,
  ) => service.create(companyId, { email, role, teamId }, caller);

  const findInvitations = (email: string) =>
    dataSource.getRepository(Invitation).find({ where: { email } });

  const findPending = (email: string) =>
    dataSource
      .getRepository(Invitation)
      .findOneByOrFail({ email, status: InvitationStatus.PENDING });

  /** The token the last email carried, read from the link that was sent. */
  const lastSentToken = (): string => {
    const [, inviteUrl] = sendInvitationEmail.mock.lastCall as [string, string];

    return new URL(inviteUrl).searchParams.get('token')!;
  };

  const failNextSend = () =>
    sendInvitationEmail.mockRejectedValueOnce(
      new InternalServerErrorException('Failed to send invitation email'),
    );

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;

    const teamVisibility = new TeamVisibilityService(
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
    );

    sendInvitationEmail = jest.fn().mockResolvedValue(undefined);

    service = new InvitationsService(
      dataSource.getRepository(Invitation),
      new UsersService(
        dataSource.getRepository(User),
        teamVisibility,
        dataSource,
      ),
      stub({ sendInvitationEmail }),
      stub({}),
      stub({}),
      stub({
        getOrThrow: (key: string) =>
          key === 'auth.invitation.expiresInMs' ? 3_600_000 : 'http://app.test',
      }),
      dataSource,
      teamVisibility,
      dataSource.getRepository(Team),
    );

    owner = await createUser('owner', UserRole.OWNER);
    alphaManager = await createUser('alphamanager', UserRole.MANAGER);
    betaManager = await createUser('betamanager', UserRole.MANAGER);

    alpha = await createLedTeam('Alpha', alphaManager);
    beta = await createLedTeam('Beta', betaManager);
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });

    await dataSource.destroy();
  });

  describe('a failed email', () => {
    it('leaves no invitation behind', async () => {
      const email = nextEmail();
      failNextSend();

      await expect(invite(owner, email, alpha)).rejects.toThrow(
        InternalServerErrorException,
      );

      await expect(findInvitations(email)).resolves.toHaveLength(0);
    });

    it('lets the same address be invited again straight away', async () => {
      const email = nextEmail();
      failNextSend();

      await expect(invite(owner, email, alpha)).rejects.toThrow();
      await invite(owner, email, alpha);

      await expect(findPending(email)).resolves.toBeDefined();
    });

    it('keeps an expired invitation revoked on the way', async () => {
      const email = nextEmail();
      await invite(owner, email, alpha);

      await dataSource
        .getRepository(Invitation)
        .update({ email }, { expiresAt: new Date(Date.now() - 1000) });

      failNextSend();
      await expect(invite(owner, email, alpha)).rejects.toThrow();

      const invitations = await findInvitations(email);

      expect(invitations.map((invitation) => invitation.status)).toEqual([
        InvitationStatus.REVOKED,
      ]);
    });
  });

  describe('listPending', () => {
    let alphaEmail: string;
    let betaEmail: string;
    let managerInviteEmail: string;

    beforeAll(async () => {
      alphaEmail = nextEmail();
      betaEmail = nextEmail();
      managerInviteEmail = nextEmail();

      await invite(alphaManager, alphaEmail, alpha);
      await invite(owner, betaEmail, beta);
      await invite(owner, managerInviteEmail, undefined, UserRole.MANAGER);
    });

    const listedEmails = async (caller: AuthUser) =>
      (await service.listPending(caller)).map((invitation) => invitation.email);

    it('shows the owner every pending invitation', async () => {
      await expect(listedEmails(owner)).resolves.toEqual(
        expect.arrayContaining([alphaEmail, betaEmail, managerInviteEmail]),
      );
    });

    it('shows a manager only invitations into teams they lead', async () => {
      const emails = await listedEmails(alphaManager);

      expect(emails).toContain(alphaEmail);
      expect(emails).not.toContain(betaEmail);
      expect(emails).not.toContain(managerInviteEmail);
    });

    it('includes one the owner sent into the manager team', async () => {
      const email = nextEmail();
      await invite(owner, email, beta);

      await expect(listedEmails(betaManager)).resolves.toContain(email);
    });

    it('leaves out an expired invitation', async () => {
      const email = nextEmail();
      await invite(owner, email, alpha);

      await dataSource
        .getRepository(Invitation)
        .update({ email }, { expiresAt: new Date(Date.now() - 1000) });

      await expect(listedEmails(owner)).resolves.not.toContain(email);
    });

    it('names the team and who sent it', async () => {
      const [invitation] = (await service.listPending(alphaManager)).filter(
        ({ email }) => email === alphaEmail,
      );

      expect(invitation.team?.id).toBe(alpha);
      expect(invitation.invitedBy?.id).toBe(alphaManager.id);
    });
  });

  describe('resend', () => {
    it('sends a new link and stops the old one working', async () => {
      const email = nextEmail();
      await invite(owner, email, alpha);
      const oldToken = lastSentToken();
      const { id } = await findPending(email);

      await service.resend(id, owner);
      const newToken = lastSentToken();

      expect(newToken).not.toBe(oldToken);
      await expect(service.findByToken(oldToken)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByToken(newToken)).resolves.toMatchObject({
        email,
      });
    });

    it('gives the invitation a new expiry', async () => {
      const email = nextEmail();
      await invite(owner, email, alpha);

      await dataSource
        .getRepository(Invitation)
        .update({ email }, { expiresAt: new Date(Date.now() + 1000) });
      const { id } = await findPending(email);

      await service.resend(id, alphaManager);

      const resent = await findPending(email);
      expect(resent.expiresAt.getTime()).toBeGreaterThan(Date.now() + 60_000);
    });

    it('keeps the old link working when the email fails', async () => {
      const email = nextEmail();
      await invite(owner, email, alpha);
      const oldToken = lastSentToken();
      const { id } = await findPending(email);

      failNextSend();
      await expect(service.resend(id, owner)).rejects.toThrow(
        InternalServerErrorException,
      );

      await expect(service.findByToken(oldToken)).resolves.toMatchObject({
        email,
      });
    });

    it('answers "not found" to a manager for another team', async () => {
      const email = nextEmail();
      await invite(owner, email, beta);
      const { id } = await findPending(email);

      await expect(service.resend(id, alphaManager)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('answers "not found" to a manager for a manager invitation', async () => {
      const email = nextEmail();
      await invite(owner, email, undefined, UserRole.MANAGER);
      const { id } = await findPending(email);

      await expect(service.resend(id, alphaManager)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('revoke', () => {
    it('stops the link working', async () => {
      const email = nextEmail();
      await invite(alphaManager, email, alpha);
      const token = lastSentToken();
      const { id } = await findPending(email);

      await service.revoke(id, alphaManager);

      await expect(service.findByToken(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('frees the address for a new invitation', async () => {
      const email = nextEmail();
      await invite(owner, email, alpha);
      const { id } = await findPending(email);

      await service.revoke(id, owner);
      await invite(owner, email, beta);

      const pending = await findPending(email);
      expect(pending.teamId).toBe(beta);
    });

    it('answers "not found" to a manager for another team', async () => {
      const email = nextEmail();
      await invite(owner, email, beta);
      const { id } = await findPending(email);

      await expect(service.revoke(id, alphaManager)).rejects.toThrow(
        NotFoundException,
      );

      await expect(findPending(email)).resolves.toBeDefined();
    });

    it('answers "not found" once already revoked', async () => {
      const email = nextEmail();
      await invite(owner, email, alpha);
      const { id } = await findPending(email);

      await service.revoke(id, owner);

      await expect(service.revoke(id, owner)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
