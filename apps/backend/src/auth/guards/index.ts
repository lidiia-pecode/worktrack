export * from './RolesGuard';
export * from './AccessGuard';
export * from './RefreshGuard';

import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import { createValidationPipe } from 'src/lib/utils/validation-pipe.util';
import { SignInPayload } from '../dtos/auth.dto';
import { createGoogleGuard } from './GoogleGuard';

/**
 * Checks the body as the pipes would, but before passport reads it (guards
 * run first), so a malformed or oversized one is refused with the field
 * errors before any password is hashed.
 */
export class LocalAuthGuard extends AuthGuard('local') {
  private readonly validationPipe = createValidationPipe();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    request.body = (await this.validationPipe.transform(request.body, {
      type: 'body',
      metatype: SignInPayload,
    })) as SignInPayload;

    return (await super.canActivate(context)) as boolean;
  }
}

export const GoogleLoginGuard = createGoogleGuard('google-login');
export const GoogleSignupGuard = createGoogleGuard('google-signup');
export const GoogleLinkGuard = createGoogleGuard('google-link');
export const GoogleInvitationGuard = createGoogleGuard('google-invitation');
