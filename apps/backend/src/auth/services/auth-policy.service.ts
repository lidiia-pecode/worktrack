import { Injectable, UnauthorizedException } from '@nestjs/common';

import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/UserRole.enum';
import { CompanyStatus } from 'src/companies/enum/company-status.enum';

@Injectable()
export class AuthPolicyService {
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  validateUserAccess(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.company?.status === CompanyStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Company account is suspended. Please contact billing.',
      );
    }
  }
}
