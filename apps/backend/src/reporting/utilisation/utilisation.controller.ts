import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { CurrentUser, Role } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { UtilisationQuery } from './dtos/utilisation-query.dto';
import { UtilisationService } from './utilisation.service';

@Controller('reporting')
@UseGuards(AccessGuard, RolesGuard)
export class UtilisationController {
  constructor(private readonly utilisationService: UtilisationService) {}

  @Get('utilisation')
  @Role(UserRole.OWNER, UserRole.MANAGER)
  getUtilisation(
    @CurrentUser() user: AuthUser,
    @Query() query: UtilisationQuery,
  ) {
    return this.utilisationService.getUtilisation(user, query);
  }
}
