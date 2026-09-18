import 'reflect-metadata';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { InvitationsService } from './invitations.service';

/**
 * Who may invite whom is plain authorisation logic with no SQL in it, so the
 * dependencies are stubbed rather than run against the database.
 */

const COMPANY_ID = '00000000-0000-4000-8000-000000000001';

const stub = <T>(value: unknown): T => value as T;

describe('InvitationsService.create', () => {
  let service: InvitationsService;
  let sendInvitationEmail: jest.Mock;

  const caller = (role: UserRole): AuthUser => ({
    id: '00000000-0000-4000-8000-000000000002',
    email: 'caller@invitations.test',
    companyId: COMPANY_ID,
    role,
  });

  const invite = (callerRole: UserRole, role: UserRole): Promise<void> =>
    service.create(
      COMPANY_ID,
      { email: 'invitee@invitations.test', role },
      caller(callerRole),
    );

  beforeEach(() => {
    sendInvitationEmail = jest.fn().mockResolvedValue(undefined);

    service = new InvitationsService(
      stub({
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((entity: unknown) => entity),
        save: jest.fn().mockResolvedValue(undefined),
      }),
      stub({ findByEmailWithCompany: jest.fn().mockResolvedValue(null) }),
      stub({ sendInvitationEmail }),
      stub({}),
      stub({}),
      stub({
        getOrThrow: (key: string) =>
          key === 'auth.invitation.expiresInMs' ? 3_600_000 : 'http://app.test',
      }),
      stub({}),
    );
  });

  it('lets an owner invite a manager', async () => {
    await invite(UserRole.OWNER, UserRole.MANAGER);

    expect(sendInvitationEmail).toHaveBeenCalled();
  });

  it('lets an owner invite an employee', async () => {
    await invite(UserRole.OWNER, UserRole.EMPLOYEE);

    expect(sendInvitationEmail).toHaveBeenCalled();
  });

  it('lets a manager invite an employee', async () => {
    await invite(UserRole.MANAGER, UserRole.EMPLOYEE);

    expect(sendInvitationEmail).toHaveBeenCalled();
  });

  it('refuses a manager inviting another manager', async () => {
    await expect(invite(UserRole.MANAGER, UserRole.MANAGER)).rejects.toThrow(
      ForbiddenException,
    );

    expect(sendInvitationEmail).not.toHaveBeenCalled();
  });

  it('refuses the OWNER role whoever asks for it', async () => {
    await expect(invite(UserRole.OWNER, UserRole.OWNER)).rejects.toThrow(
      BadRequestException,
    );

    expect(sendInvitationEmail).not.toHaveBeenCalled();
  });
});
