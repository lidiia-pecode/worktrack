export * from './RolesGuard';
export * from './GoogleGuard';
export * from './AccessGuard';

import { AuthGuard } from '@nestjs/passport';

export class LocalAuthGuard extends AuthGuard('local') {}
export class RefreshGuard extends AuthGuard('jwt-refresh') {}
