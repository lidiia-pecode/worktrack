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

  validateUserAccess(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw authError(AuthErrorCode.ACCOUNT_INACTIVE);
    }

    if (user.company?.status === CompanyStatus.SUSPENDED) {
      throw authError(AuthErrorCode.COMPANY_SUSPENDED);
    }
  }
}
