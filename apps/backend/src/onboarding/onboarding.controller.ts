import { Controller, Get, UseGuards } from '@nestjs/common';

import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { CurrentUser, Role } from 'src/lib/decorators';
import { Serialize } from 'src/lib/interceptors';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { UserRole } from 'src/users/enums/UserRole.enum';

import { OnboardingService } from './onboarding.service';
import { OwnerSetupStateDto } from './dtos/owner-setup-state.dto';
import { ManagerSetupStateDto } from './dtos/manager-setup-state.dto';

@Controller('onboarding')
@UseGuards(AccessGuard, RolesGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Role(UserRole.OWNER)
  @Get('owner/setup-state')
  @Serialize(OwnerSetupStateDto)
  async getOwnerSetupState(
    @CurrentUser() authUser: AuthUser,
  ): Promise<OwnerSetupStateDto> {
    return this.onboardingService.getOwnerSetupState(authUser.companyId);
  }

  @Role(UserRole.MANAGER)
  @Get('manager/setup-state')
  @Serialize(ManagerSetupStateDto)
  async getManagerSetupState(
    @CurrentUser() authUser: AuthUser,
  ): Promise<ManagerSetupStateDto> {
    return this.onboardingService.getManagerSetupState(
      authUser.companyId,
      authUser.id,
    );
  }
}
