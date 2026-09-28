import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';

import { ReportingService } from './reporting.service';
import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { UserRole } from 'src/users/enums/user-role.enum';
import { CurrentUser, Role } from 'src/lib/decorators';
import { PlannedVsActualQuery } from './dtos/planned-vs-actual-query.dto';
import { HoursReportQuery } from './dtos/hours-report-query.dto';
import { HoursExportQuery } from './dtos/hours-export-query.dto';
import {
  buildHoursExportWorkbook,
  hoursExportFileName,
  XLSX_CONTENT_TYPE,
} from './hours-export.workbook';
import {
  ReportingMonthParam,
  ReportingPeriodsQuery,
} from './dtos/reporting-month.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Controller('reporting')
@UseGuards(AccessGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // ==========================================
  // PERIODS
  // ==========================================

  @Get('periods')
  listPeriods(
    @CurrentUser() user: AuthUser,
    @Query() query: ReportingPeriodsQuery,
  ) {
    return this.reportingService.listMonths(user.companyId, query);
  }

  @Post('periods/:month/reopen')
  @Role(UserRole.OWNER)
  reopenPeriod(
    @CurrentUser() user: AuthUser,
    @Param() { month }: ReportingMonthParam,
  ) {
    return this.reportingService.reopenMonth(user.companyId, month, user.id);
  }

  @Post('periods/:month/close')
  @Role(UserRole.OWNER)
  closePeriod(
    @CurrentUser() user: AuthUser,
    @Param() { month }: ReportingMonthParam,
  ) {
    return this.reportingService.closeMonth(user.companyId, month, user.id);
  }

  // ==========================================
  // ANALYTICS & DASHBOARDS
  // ==========================================

  @Get('hours')
  @Role(UserRole.OWNER, UserRole.MANAGER)
  getHoursReport(
    @CurrentUser() user: AuthUser,
    @Query() query: HoursReportQuery,
  ) {
    return this.reportingService.getHoursReport(user, query);
  }

  @Get('hours/export')
  @Role(UserRole.OWNER, UserRole.MANAGER)
  async exportHours(
    @CurrentUser() user: AuthUser,
    @Query() query: HoursExportQuery,
  ) {
    const rows = await this.reportingService.getHoursExport(user, query);

    return new StreamableFile(await buildHoursExportWorkbook(rows), {
      type: XLSX_CONTENT_TYPE,
      disposition: `attachment; filename="${hoursExportFileName(query)}"`,
    });
  }

  @Get('planned-vs-actual')
  getPlannedVsActualReport(
    @CurrentUser() user: AuthUser,
    @Query() query: PlannedVsActualQuery,
  ) {
    return this.reportingService.getPlannedVsActualReport(user, query);
  }
}
