import { Controller, Get, Query, StreamableFile } from '@nestjs/common';

import { CurrentUser, Role } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { HoursExportQuery } from '../dtos/hours-export-query.dto';
import { ReportRangeQuery } from '../dtos/report-range-query.dto';
import {
  buildHoursExportWorkbook,
  hoursExportFileName,
  XLSX_CONTENT_TYPE,
} from '../hours-export.workbook';
import { ReportingService } from '../reporting.service';
import { PeopleReportQuery } from './dtos/people-report-query.dto';
import { PeopleReportService } from './people-report.service';

@Controller('reporting')
export class PeopleReportController {
  constructor(
    private readonly peopleReportService: PeopleReportService,
    private readonly reportingService: ReportingService,
  ) {}

  @Get('people')
  getPeopleReport(
    @CurrentUser() user: AuthUser,
    @Query() query: PeopleReportQuery,
  ) {
    return this.peopleReportService.getPeopleReport(user, query);
  }

  /** Reports' opening figures; the timeline in it stays closed to employees. */
  @Get('overview')
  @Role(UserRole.OWNER, UserRole.MANAGER)
  getOverview(@CurrentUser() user: AuthUser, @Query() query: ReportRangeQuery) {
    return this.peopleReportService.getOverview(user, query);
  }

  /**
   * The hours export: time entries and each person's summary over the same
   * finished days. Here rather than beside the Hours report because the
   * summary is the People report's.
   */
  @Get('hours/export')
  @Role(UserRole.OWNER, UserRole.MANAGER)
  async exportHours(
    @CurrentUser() user: AuthUser,
    @Query() query: HoursExportQuery,
  ) {
    const [{ rows, countedTo }, summary, teamName] = await Promise.all([
      this.reportingService.getHoursExport(user, query),
      this.peopleReportService.getPeopleReport(user, query),
      query.teamId
        ? this.reportingService.exportTeamName(user, query.teamId)
        : null,
    ]);
    const fileName = hoursExportFileName(query.dateFrom, countedTo, teamName);

    return new StreamableFile(await buildHoursExportWorkbook(rows, summary), {
      type: XLSX_CONTENT_TYPE,
      disposition: `attachment; filename="${fileName}"`,
    });
  }
}
