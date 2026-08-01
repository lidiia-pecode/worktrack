import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { AuthContext } from '../auth-strategies/types';

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

    const request = context.switchToHttp().getRequest<{ user?: AuthContext }>();

    if (!request.user) {
      return false;
    }

    const auth = request.user;

    return auth ? requiredRoles.includes(auth.user.role) : false;
  }
}
