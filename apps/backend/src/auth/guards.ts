import { AuthGuard } from '@nestjs/passport';

export class LocalAuthGuard extends AuthGuard('local') {}
export class AccessGuard extends AuthGuard('jwt-access') {}
export class RefreshGuard extends AuthGuard('jwt-refresh') {}
export class GoogleGuard extends AuthGuard('google') {}
