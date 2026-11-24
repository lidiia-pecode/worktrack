import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';

import { PlanningService } from './planning.service';
import { PlanningEntryResponse } from './dtos/planning-entry-response.dto';
import { PlanningQueryDto } from './dtos/planning-query.dto';
import { PlanningPeriodQuery } from './dtos/planning-period-query.dto';
import {
  PlanningMonthResponse,
  PlanningWeekResponse,
} from './dtos/planning-grid-response.dto';
import { PlanningRemovalCountQuery } from './dtos/planning-removal-count-query.dto';
import {
  DeletePeriodPlansQuery,
  PlanPeriodPayload,
  PreviewPeriodPayload,
} from './dtos/plan-period-payload.dto';

import { Serialize, SerializeList } from 'src/lib/interceptors';
import { CurrentUser } from 'src/lib/decorators';
import { Role } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Controller('planning')
export class PlanningController {
  constructor(private readonly service: PlanningService) {}

  @Get()
  @SerializeList(PlanningEntryResponse)
  list(@Query() query: PlanningQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }

  @Get('week')
  @Serialize(PlanningWeekResponse)
  getWeek(@Query() query: PlanningPeriodQuery, @CurrentUser() user: AuthUser) {
    return this.service.getWeek(query, user);
  }

  @Get('month')
  @Serialize(PlanningMonthResponse)
  getMonth(@Query() query: PlanningPeriodQuery, @CurrentUser() user: AuthUser) {
    return this.service.getMonth(query, user);
  }

  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Get('removal-count')
  countRemovable(
    @Query() query: PlanningRemovalCountQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.countRemovable(query, user);
  }

  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Post('period')
  planPeriod(
    @Body() payload: PlanPeriodPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.planPeriod(payload, user);
  }

  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Post('period/preview')
  @HttpCode(HttpStatus.OK)
  previewPeriod(
    @Body() payload: PreviewPeriodPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.previewPeriod(payload, user);
  }

  // Before `:id`, which would otherwise take "period" as an id.
  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Delete('period')
  deletePeriodPlans(
    @Query() query: DeletePeriodPlansQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.deletePeriodPlans(query, user);
  }
}
