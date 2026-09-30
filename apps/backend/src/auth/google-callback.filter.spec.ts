import 'reflect-metadata';
import { ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  UnusableInvitationCode,
  unusableInvitation,
} from 'src/invitations/unusable-invitation';

import { AuthErrorCode, authError } from './auth-error';
import {
  GoogleInvitationCallbackFilter,
  GoogleLinkCallbackFilter,
  GoogleLoginCallbackFilter,
} from './google-callback.filter';
import type { CookieService } from './services/cookie.service';

const stub = <T>(value: unknown): T => value as T;

describe('Google callback filter', () => {
  let redirect: jest.Mock;
  let clearInvitationFlowCookie: jest.Mock;
  let cookieService: CookieService;

  beforeEach(() => {
    redirect = jest.fn();
    clearInvitationFlowCookie = jest.fn();
    cookieService = stub<CookieService>({
      getFrontendUrl: () => 'http://app.test',
      getInvitationFlowToken: () => 'invite-token',
      clearInvitationFlowCookie,
    });
  });

  const host = (query: Record<string, string> = {}) =>
    stub<ArgumentsHost>({
      switchToHttp: () => ({
        getRequest: () => stub<Request>({ query }),
        getResponse: () => stub<Response>({ redirect }),
      }),
    });

  it('returns to the sign-in page with the code the service gave', () => {
    new GoogleLoginCallbackFilter(cookieService).catch(
      authError(AuthErrorCode.GOOGLE_NO_ACCOUNT),
      host(),
    );

    expect(redirect).toHaveBeenCalledWith(
      'http://app.test/login?error=GOOGLE_NO_ACCOUNT',
    );
  });

  it('tells a cancelled consent screen apart from other failures', () => {
    const filter = new GoogleLoginCallbackFilter(cookieService);

    filter.catch(new UnauthorizedException(), host({ error: 'access_denied' }));
    filter.catch(new UnauthorizedException('Invalid state'), host());

    expect(redirect.mock.calls).toEqual([
      ['http://app.test/login?error=GOOGLE_CANCELLED'],
      ['http://app.test/login?error=GOOGLE_FAILED'],
    ]);
  });

  it('turns an unexpected error into a generic code', () => {
    const filter = new GoogleLinkCallbackFilter(cookieService);
    const logError = jest
      .spyOn(filter.logger, 'error')
      .mockImplementation(() => undefined);

    filter.catch(new Error('database down'), host());

    expect(logError).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      'http://app.test/settings?error=GOOGLE_FAILED',
    );
  });

  it('returns to the invitation and clears its cookie', () => {
    new GoogleInvitationCallbackFilter(cookieService).catch(
      unusableInvitation(UnusableInvitationCode.EXPIRED),
      host(),
    );

    expect(clearInvitationFlowCookie).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      'http://app.test/invitations/complete?error=INVITATION_EXPIRED&token=invite-token',
    );
  });
});
