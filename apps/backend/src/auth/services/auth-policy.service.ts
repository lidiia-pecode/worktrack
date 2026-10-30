import { Injectable } from '@nestjs/common';

import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/user-role.enum';
import { CompanyStatus } from 'src/companies/enums/company-status.enum';

import { AuthErrorCode, authError } from '../auth-error';

@Injectable()
export class AuthPolicyService {
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /** Whether the account may sign in: active, in a company that isn't suspended. */
  hasAccess(user: User): boolean {
    return (
      user.status === UserStatus.ACTIVE &&
      user.company?.status !== CompanyStatus.SUSPENDED
    );
  }

  validateUserAccess(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw authError(AuthErrorCode.ACCOUNT_INACTIVE);
    }

    if (user.company?.status === CompanyStatus.SUSPENDED) {
      throw authError(AuthErrorCode.COMPANY_SUSPENDED);
    }
  }
}
