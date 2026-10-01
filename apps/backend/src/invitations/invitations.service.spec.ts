import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from 'src/users/enums/user-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { InvitationsService } from './invitations.service';

/**
 * Who may invite whom into which team is plain authorisation logic with no SQL
 * in it, so the dependencies are stubbed rather than run against the database.
 */

const COMPANY_ID = '00000000-0000-4000-8000-000000000001';
const CALLER_ID = '00000000-0000-4000-8000-000000000002';

const LED_TEAM_ID = '00000000-0000-4000-8000-000000000010';
const OTHER_TEAM_ID = '00000000-0000-4000-8000-000000000011';
const ARCHIVED_TEAM_ID = '00000000-0000-4000-8000-000000000012';
const MISSING_TEAM_ID = '00000000-0000-4000-8000-000000000013';

const TEAMS: Record<string, { id: string; status: TeamStatus }> = {
  [LED_TEAM_ID]: { id: LED_TEAM_ID, status: TeamStatus.ACTIVE },
  [OTHER_TEAM_ID]: { id: OTHER_TEAM_ID, status: TeamStatus.ACTIVE },
  [ARCHIVED_TEAM_ID]: { id: ARCHIVED_TEAM_ID, status: TeamStatus.ARCHIVED },
};

const stub = <T>(value: unknown): T => value as T;

describe('InvitationsService.create', () => {
  let service: InvitationsService;
  let sendInvitationEmail: jest.Mock;
  let createInvitation: jest.Mock;

  const caller = (role: UserRole): AuthUser => ({
    id: CALLER_ID,
    email: 'caller@invitations.test',
    companyId: COMPANY_ID,
    role,
  });

  const invite = (
    callerRole: UserRole,
    role: UserRole,
    teamId?: string,
  ): Promise<void> =>
    service.create(
      COMPANY_ID,
      { email: 'invitee@invitations.test', role, teamId },
      caller(callerRole),
    );

  let findByEmailWithCompany: jest.Mock;

  beforeEach(() => {
    sendInvitationEmail = jest.fn().mockResolvedValue(undefined);
    findByEmailWithCompany = jest.fn().mockResolvedValue(null);
    createInvitation = jest.fn((entity: unknown) => entity);

    const invitationRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: createInvitation,
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      findOneOrFail: jest.fn().mockResolvedValue({
        email: 'invitee@invitations.test',
        role: UserRole.EMPLOYEE,
        company: { companyName: 'Clarke Studio' },
        invitedBy: null,
        team: null,
      }),
    };

    service = new InvitationsService(
      stub(invitationRepository),
      stub({ findByEmailWithCompany }),
      stub({ sendInvitationEmail }),
      stub({}),
      stub({}),
      stub({ getOrThrow: () => 'http://app.test' }),
      stub({
        transaction: (work: (manager: unknown) => Promise<unknown>) =>
          work({ getRepository: () => invitationRepository }),
      }),
      stub({
        getVisibleTeamIds: jest.fn((user: AuthUser) =>
          Promise.resolve(user.role === UserRole.OWNER ? null : [LED_TEAM_ID]),
        ),
      }),
      stub({
        findOne: jest.fn(
          ({ where }: { where: { id: string } }): Promise<unknown> =>
            Promise.resolve(TEAMS[where.id] ?? null),
        ),
      }),
      stub({ notifyInvitationAccepted: jest.fn() }),
    );
  });

  describe('role', () => {
    it('lets an owner invite a manager', async () => {
      await invite(UserRole.OWNER, UserRole.MANAGER);

      expect(sendInvitationEmail).toHaveBeenCalled();
    });

    it('lets an owner invite an employee', async () => {
      await invite(UserRole.OWNER, UserRole.EMPLOYEE, OTHER_TEAM_ID);

      expect(sendInvitationEmail).toHaveBeenCalled();
    });

    it('lets a manager invite an employee', async () => {
      await invite(UserRole.MANAGER, UserRole.EMPLOYEE, LED_TEAM_ID);

      expect(sendInvitationEmail).toHaveBeenCalled();
    });

    it('refuses a manager inviting another manager', async () => {
      await expect(
        invite(UserRole.MANAGER, UserRole.MANAGER, LED_TEAM_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('refuses the OWNER role whoever asks for it', async () => {
      await expect(invite(UserRole.OWNER, UserRole.OWNER)).rejects.toThrow(
        BadRequestException,
      );

      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });
  });

  describe('team', () => {
    it('refuses a manager who names no team', async () => {
      await expect(invite(UserRole.MANAGER, UserRole.EMPLOYEE)).rejects.toThrow(
        BadRequestException,
      );

      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('refuses a manager naming a team they do not lead', async () => {
      await expect(
        invite(UserRole.MANAGER, UserRole.EMPLOYEE, OTHER_TEAM_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('refuses an owner inviting an employee with no team', async () => {
      await expect(invite(UserRole.OWNER, UserRole.EMPLOYEE)).rejects.toThrow(
        BadRequestException,
      );

      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('invites a manager without a team', async () => {
      await invite(UserRole.OWNER, UserRole.MANAGER);

      expect(createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ teamId: null }),
      );
    });

    it.each([
      ['another manager', OTHER_TEAM_ID],
      ['an archived team', ARCHIVED_TEAM_ID],
      ['no such team', MISSING_TEAM_ID],
    ])('gives a manager the same answer for %s', async (_case, teamId) => {
      await expect(
        invite(UserRole.MANAGER, UserRole.EMPLOYEE, teamId),
      ).rejects.toThrow(
        new ForbiddenException('You can only invite into teams you lead'),
      );
    });

    it('lets an owner invite into any active team', async () => {
      await invite(UserRole.OWNER, UserRole.EMPLOYEE, OTHER_TEAM_ID);

      expect(sendInvitationEmail).toHaveBeenCalled();
    });

    it('refuses an archived team', async () => {
      await expect(
        invite(UserRole.OWNER, UserRole.EMPLOYEE, ARCHIVED_TEAM_ID),
      ).rejects.toThrow(BadRequestException);

      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('refuses a team that is not in the company', async () => {
      await expect(
        invite(UserRole.OWNER, UserRole.EMPLOYEE, MISSING_TEAM_ID),
      ).rejects.toThrow(NotFoundException);

      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('lets an owner invite a manager to lead a team', async () => {
      await invite(UserRole.OWNER, UserRole.MANAGER, OTHER_TEAM_ID);

      expect(createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.MANAGER,
          teamId: OTHER_TEAM_ID,
        }),
      );
    });

    it('refuses to invite a manager to lead an archived team', async () => {
      await expect(
        invite(UserRole.OWNER, UserRole.MANAGER, ARCHIVED_TEAM_ID),
      ).rejects.toThrow(BadRequestException);

      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('stores the team and who sent the invitation', async () => {
      await invite(UserRole.MANAGER, UserRole.EMPLOYEE, LED_TEAM_ID);

      expect(createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: LED_TEAM_ID,
          invitedById: CALLER_ID,
        }),
      );
    });
  });

  describe('an address that already has an account', () => {
    it('says so plainly when the account is in this company', async () => {
      findByEmailWithCompany.mockResolvedValue({ companyId: COMPANY_ID });

      await expect(invite(UserRole.OWNER, UserRole.MANAGER)).rejects.toThrow(
        'A user with this email already belongs to this company',
      );
    });

    it('gives a neutral answer when the account is in another company', async () => {
      findByEmailWithCompany.mockResolvedValue({ companyId: 'other-company' });

      await expect(invite(UserRole.OWNER, UserRole.MANAGER)).rejects.toThrow(
        new ConflictException('This email address cannot be invited'),
      );
      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });
  });
});
