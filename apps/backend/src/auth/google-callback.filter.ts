import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthErrorCode } from './auth-error';
import { CookieService } from './services/cookie.service';

/** The page each Google flow started from, and so returns to on failure. */
type GoogleFlow = 'login' | 'signup' | 'invitation' | 'link';

const RETURN_PATHS: Record<GoogleFlow, string> = {
  login: '/login',
  signup: '/register',
  invitation: '/invitations/complete',
  link: '/settings',
};

const errorCode = (exception: unknown, request: Request): string => {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (
      typeof response === 'object' &&
      'code' in response &&
      typeof response.code === 'string'
    ) {
      return response.code;
    }
  }

  // Google sends the person back with this when they cancel its consent screen.
  return request.query.error === 'access_denied'
    ? AuthErrorCode.GOOGLE_CANCELLED
    : AuthErrorCode.GOOGLE_FAILED;
};

/**
 * A Google callback is a browser redirect, so any failure — the guard, the
 * service or something unexpected — goes back to a WorkTrack page with a code
 * instead of showing JSON on the backend's host.
 */
export function createGoogleCallbackFilter(flow: GoogleFlow) {
  @Catch()
  @Injectable()
  class GoogleCallbackFilter implements ExceptionFilter {
    readonly logger = new Logger(`GoogleCallback:${flow}`);

    constructor(readonly cookieService: CookieService) {}

    catch(exception: unknown, host: ArgumentsHost): void {
      const request = host.switchToHttp().getRequest<Request>();
      const response = host.switchToHttp().getResponse<Response>();

      if (!(exception instanceof HttpException)) {
        this.logger.error(exception);
      }

      const query = new URLSearchParams({
        error: errorCode(exception, request),
      });

      if (flow === 'invitation') {
        const token = this.cookieService.getInvitationFlowToken(request);

        if (token) query.set('token', token);

        this.cookieService.clearInvitationFlowCookie(response);
      }

      response.redirect(
        `${this.cookieService.getFrontendUrl()}${RETURN_PATHS[flow]}?${query}`,
      );
    }
  }

  return GoogleCallbackFilter;
}

export const GoogleLoginCallbackFilter = createGoogleCallbackFilter('login');
export const GoogleSignupCallbackFilter = createGoogleCallbackFilter('signup');
export const GoogleInvitationCallbackFilter =
  createGoogleCallbackFilter('invitation');
export const GoogleLinkCallbackFilter = createGoogleCallbackFilter('link');
