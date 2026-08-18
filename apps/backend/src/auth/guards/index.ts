export * from './RolesGuard';
export * from './AccessGuard';
export * from './RefreshGuard';

import { AuthGuard } from '@nestjs/passport';
import { createGoogleGuard } from './GoogleGuard';

export class LocalAuthGuard extends AuthGuard('local') {}

export const GoogleLoginGuard = createGoogleGuard('google-login');
export const GoogleSignupGuard = createGoogleGuard('google-signup');
export const GoogleLinkGuard = createGoogleGuard('google-link');
