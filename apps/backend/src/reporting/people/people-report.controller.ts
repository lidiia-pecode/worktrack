import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { CurrentUser, Role } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { PeopleReportQuery } from './dtos/people-report-query.dto';
import { PeopleReportService } from './people-report.service';

@Controller('reporting')
@UseGuards(AccessGuard, RolesGuard)
export class PeopleReportController {
  constructor(private readonly peopleReportService: PeopleReportService) {}

  @Get('people')
  getPeopleReport(
    @CurrentUser() user: AuthUser,
    @Query() query: PeopleReportQuery,
  ) {
    return this.peopleReportService.getPeopleReport(user, query);
  }

  @Get('timeline')
  @Role(UserRole.OWNER, UserRole.MANAGER)
  getTimeline(
    @CurrentUser() user: AuthUser,
    @Query() query: PeopleReportQuery,
  ) {
    return this.peopleReportService.getTimeline(user, query);
  }
}
