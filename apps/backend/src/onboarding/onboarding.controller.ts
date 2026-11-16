import { Controller, Get, Post } from '@nestjs/common';

import { CurrentUser, Role } from 'src/lib/decorators';
import { Serialize } from 'src/lib/interceptors';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { UserRole } from 'src/users/enums/user-role.enum';

import { OnboardingService } from './onboarding.service';
import { OwnerSetupStateDto } from './dtos/owner-setup-state.dto';

@Controller('onboarding')
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

  @Role(UserRole.OWNER)
  @Post('owner/skip')
  @Serialize(OwnerSetupStateDto)
  async skipOwnerSetup(
    @CurrentUser() authUser: AuthUser,
  ): Promise<OwnerSetupStateDto> {
    return this.onboardingService.skipOwnerSetup(authUser.companyId);
  }
}
