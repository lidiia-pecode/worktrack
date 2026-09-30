import 'reflect-metadata';
import type { Response } from 'express';

import type { CookieService } from 'src/auth/services/cookie.service';

import { InvitationsController } from './invitations.controller';
import type { InvitationsService } from './invitations.service';
import {
  UnusableInvitationCode,
  unusableInvitation,
} from './unusable-invitation';

const stub = <T>(value: unknown): T => value as T;

describe('InvitationsController.startGoogleInvitation', () => {
  let assertUsableToken: jest.Mock;
  let setInvitationFlowCookie: jest.Mock;
  let redirect: jest.Mock;
  let controller: InvitationsController;

  beforeEach(() => {
    assertUsableToken = jest.fn().mockResolvedValue(undefined);
    setInvitationFlowCookie = jest.fn();
    redirect = jest.fn();

    controller = new InvitationsController(
      stub<InvitationsService>({ assertUsableToken }),
      stub<CookieService>({
        setInvitationFlowCookie,
        getFrontendUrl: () => 'http://app.test',
      }),
    );
  });

  const start = (token: string) =>
    controller.startGoogleInvitation(token, stub<Response>({ redirect }));

  it('continues to Google with a usable link', async () => {
    await start('good-token');

    expect(setInvitationFlowCookie).toHaveBeenCalledWith(
      expect.anything(),
      'good-token',
    );
    expect(redirect).toHaveBeenCalledWith('./google/authorize');
  });

  it('returns an unusable link to the invitation page instead', async () => {
    assertUsableToken.mockRejectedValue(
      unusableInvitation(UnusableInvitationCode.EXPIRED),
    );

    await start('old token');

    expect(setInvitationFlowCookie).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      'http://app.test/invitations/complete?token=old+token',
    );
  });

  it('lets an unexpected failure through', async () => {
    assertUsableToken.mockRejectedValue(new Error('database down'));

    await expect(start('good-token')).rejects.toThrow('database down');
    expect(redirect).not.toHaveBeenCalled();
  });
});
