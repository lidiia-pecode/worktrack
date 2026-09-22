import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ExpectedHoursService } from './expected-hours.service';
import { ExpectedHoursQuery } from './dtos/expected-hours-query.dto';
import { ExpectedHoursResponse } from './dtos/expected-hours-response.dto';

import { Serialize } from 'src/lib/interceptors';
import { CurrentUser } from 'src/lib/decorators';
import { AccessGuard } from 'src/auth/guards';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Controller('capacity')
@UseGuards(AccessGuard)
export class CapacityController {
  constructor(private readonly expectedHours: ExpectedHoursService) {}

  @Get('expected')
  @Serialize(ExpectedHoursResponse)
  async getExpected(
    @Query() query: ExpectedHoursQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<ExpectedHoursResponse> {
    const expectedMinutes = await this.expectedHours.expectedMinutesForUser(
      user.companyId,
      user.id,
      query.dateFrom,
      query.dateTo,
    );

    return { dateFrom: query.dateFrom, dateTo: query.dateTo, expectedMinutes };
  }
}
