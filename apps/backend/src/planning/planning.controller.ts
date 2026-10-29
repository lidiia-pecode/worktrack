import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PlanningService } from './planning.service';
import { PlanningEntryResponse } from './dtos/planning-entry-response.dto';
import {
  CreatePlanningEntryDto,
  UpdatePlanningEntryDto,
} from './dtos/planning-entry-payload.dto';
import { PlanningQueryDto } from './dtos/planning-query.dto';
import { PlanningWeekQuery } from './dtos/planning-week-query.dto';
import { PlanningWeekResponse } from './dtos/planning-week-response.dto';
import { PlanningRemovalCountQuery } from './dtos/planning-removal-count-query.dto';
import {
  DeletePeriodPlansQuery,
  PlanPeriodPayload,
  PreviewPeriodPayload,
} from './dtos/plan-period-payload.dto';

import { Serialize, SerializeList } from 'src/lib/interceptors';
import { CurrentUser } from 'src/lib/decorators';
import { AccessGuard } from 'src/auth/guards';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { Role } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Controller('planning')
@UseGuards(AccessGuard)
export class PlanningController {
  constructor(private readonly service: PlanningService) {}

  @Get()
  @SerializeList(PlanningEntryResponse)
  list(@Query() query: PlanningQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }

  @Get('week')
  @Serialize(PlanningWeekResponse)
  getWeek(@Query() query: PlanningWeekQuery, @CurrentUser() user: AuthUser) {
    return this.service.getWeek(query, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Get('removal-count')
  countRemovable(
    @Query() query: PlanningRemovalCountQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.countRemovable(query, user);
  }

  @Get(':id')
  @Serialize(PlanningEntryResponse)
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getById(id, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Post()
  @Serialize(PlanningEntryResponse)
  create(
    @Body() payload: CreatePlanningEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(payload, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Post('period')
  planPeriod(
    @Body() payload: PlanPeriodPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.planPeriod(payload, user);
  }

  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Delete('period')
  deletePeriodPlans(
    @Query() query: DeletePeriodPlansQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.deletePeriodPlans(query, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Patch(':id')
  @Serialize(PlanningEntryResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdatePlanningEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, payload, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.OWNER)
  @Delete(':id')
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.delete(id, user);
  }
}
