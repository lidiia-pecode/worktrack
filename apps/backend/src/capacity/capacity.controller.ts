import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CapacityService } from './capacity.service';
import { ExpectedHoursService } from './expected-hours.service';
import { ExpectedHoursQuery } from './dtos/expected-hours-query.dto';
import { ExpectedHoursResponse } from './dtos/expected-hours-response.dto';
import { SetCapacityPayload } from './dtos/set-capacity-payload.dto';
import { CapacityResponse } from './dtos/capacity-response.dto';

import { Serialize } from 'src/lib/interceptors';
import { CurrentUser, Role } from 'src/lib/decorators';
import { AccessGuard } from 'src/auth/guards';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Controller('capacity')
@UseGuards(AccessGuard)
export class CapacityController {
  constructor(
    private readonly capacity: CapacityService,
    private readonly expectedHours: ExpectedHoursService,
  ) {}

  /** The caller's own expected hours. Other people's come with the team summary. */
  @Get('expected')
  @Serialize(ExpectedHoursResponse)
  async getExpected(
    @Query() query: ExpectedHoursQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<ExpectedHoursResponse> {
    const expected = await this.expectedHours.expectedForUser(
      user.companyId,
      user.id,
      query.dateFrom,
      query.dateTo,
    );

    return {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      expectedMinutes: expected.total,
      expectedToDateMinutes: expected.toDate,
    };
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.OWNER)
  @Get('users/:userId')
  @Serialize(CapacityResponse)
  getForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.capacity.currentFor(user.companyId, userId, todayISODate());
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.OWNER)
  @Post()
  @Serialize(CapacityResponse)
  setForUser(
    @Body() payload: SetCapacityPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.capacity.setCapacity(
      user.companyId,
      payload.userId,
      payload.minutesPerWeek,
      payload.validFrom,
      user.id,
    );
  }
}

const todayISODate = () => new Date().toISOString().slice(0, 10);
