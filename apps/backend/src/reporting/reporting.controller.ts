import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ReportingService } from './reporting.service';
import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { CurrentAuth } from 'src/lib/decorators/current-auth.decorator';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { Role } from 'src/lib/decorators';
import {
  CreateReportingPeriodDto,
  UpdateReportingPeriodDto,
} from './dtos/reporting-period.dto';
import { GetReportQueryDto } from './dtos/report-query.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Controller('reporting')
@UseGuards(AccessGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // ==========================================
  // PERIODS CONTROL (OWNER ONLY)
  // ==========================================

  @Post('periods')
  @Role(UserRole.OWNER)
  createPeriod(
    @CurrentAuth() user: AuthUser,
    @Body() dto: CreateReportingPeriodDto,
  ) {
    return this.reportingService.createPeriod(user.companyId, dto);
  }

  @Get('periods')
  findAllPeriods(@CurrentAuth() user: AuthUser) {
    return this.reportingService.findAllPeriods(user.companyId);
  }

  @Patch('periods/:id')
  @Role(UserRole.OWNER)
  updatePeriod(
    @CurrentAuth() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateReportingPeriodDto,
  ) {
    return this.reportingService.updatePeriod(user.companyId, id, dto);
  }

  // ==========================================
  // ANALYTICS & DASHBOARDS
  // ==========================================

  @Get('planned-vs-actual')
  getPlannedVsActual(
    @CurrentAuth() user: AuthUser,
    @Query() query: GetReportQueryDto,
  ) {
    return this.reportingService.getPlannedVsActualReport(user, query);
  }
}
