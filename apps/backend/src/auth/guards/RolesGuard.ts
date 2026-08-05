// apps/backend/src/auth/guards/RolesGuard.ts

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { AuthContext, AuthUser } from '../auth-strategies/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthContext | AuthUser }>();
    const raw = request.user;
    if (!raw) return false;
    const role = 'user' in raw ? raw.user.role : raw.role;

    return requiredRoles.includes(role);
  }
}
