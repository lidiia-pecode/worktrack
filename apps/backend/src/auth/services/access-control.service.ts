import { ForbiddenException, Injectable } from '@nestjs/common';
import { Status } from 'src/enums/Status.enum';
import { Project } from 'src/projects/entities/project.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/UserRole.enum';

@Injectable()
export class AccessControlService {
  // --------------------------------------------------------------------------
  // Roles
  // --------------------------------------------------------------------------

  isMember(user: User): boolean {
    return user.role === UserRole.MEMBER;
  }

  isManager(user: User): boolean {
    return user.role === UserRole.MANAGER;
  }

  isSuperAdmin(user: User): boolean {
    return user.role === UserRole.SUPER_ADMIN;
  }

  hasManagerPermissions(user: User): boolean {
    return this.isManager(user) || this.isSuperAdmin(user);
  }

  // --------------------------------------------------------------------------
  // Projects
  // --------------------------------------------------------------------------

  canBeProjectMember(user: User) {
    return (
      user.status === Status.ACTIVE &&
      [UserRole.MEMBER, UserRole.MANAGER].includes(user.role)
    );
  }

  canCreateProject(user: User): boolean {
    return this.hasManagerPermissions(user);
  }

  canUpdateProject(user: User, project: Project): boolean {
    if (this.isSuperAdmin(user)) {
      return true;
    }

    return this.isManager(user) && project.owner.id === user.id;
  }

  canArchiveProject(user: User, project: Project): boolean {
    return this.canUpdateProject(user, project);
  }

  // --------------------------------------------------------------------------
  // Time Logs
  // --------------------------------------------------------------------------

  canViewTimeLog(user: User, log: TimeLog): boolean {
    if (this.isSuperAdmin(user)) {
      return true;
    }

    if (this.isManager(user)) {
      return log.projectActivity.project.owner.id === user.id;
    }

    return log.userId === user.id;
  }

  canModifyTimeLog(user: User, log: TimeLog): boolean {
    return log.userId === user.id;
  }

  canDeleteTimeLog(user: User, log: TimeLog): boolean {
    return this.canModifyTimeLog(user, log);
  }

  // --------------------------------------------------------------------------
  // Assert helpers
  // --------------------------------------------------------------------------

  assertHasManagerPermissions(user: User): void {
    if (!this.hasManagerPermissions(user)) {
      throw new ForbiddenException(
        'Only managers are allowed to perform this action',
      );
    }
  }

  assertCanCreateProject(user: User): void {
    if (!this.canCreateProject(user)) {
      throw new ForbiddenException();
    }
  }

  assertCanUpdateProject(user: User, project: Project): void {
    if (!this.canUpdateProject(user, project)) {
      throw new ForbiddenException();
    }
  }

  assertCanViewTimeLog(user: User, log: TimeLog): void {
    if (!this.canViewTimeLog(user, log)) {
      throw new ForbiddenException();
    }
  }

  assertCanModifyTimeLog(user: User, log: TimeLog): void {
    if (!this.canModifyTimeLog(user, log)) {
      throw new ForbiddenException();
    }
  }

  assertCanDeleteTimeLog(user: User, log: TimeLog): void {
    if (!this.canDeleteTimeLog(user, log)) {
      throw new ForbiddenException();
    }
  }
}
