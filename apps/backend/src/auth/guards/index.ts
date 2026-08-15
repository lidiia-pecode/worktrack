export * from './RolesGuard';
export * from './GoogleGuard';
export * from './AccessGuard';
export * from './RefreshGuard';

import { AuthGuard } from '@nestjs/passport';

export class LocalAuthGuard extends AuthGuard('local') {}
