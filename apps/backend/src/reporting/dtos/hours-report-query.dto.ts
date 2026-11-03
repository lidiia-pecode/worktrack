import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { HoursReportGroupBy } from '../enums/hours-report-group-by.enum';
import { ReportRangeQuery } from './report-range-query.dto';

export class HoursReportQuery extends ReportRangeQuery {
  @IsEnum(HoursReportGroupBy)
  groupBy!: HoursReportGroupBy;

  /** Only time and plans on this project. */
  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** Only this person's time and plans, within the people the caller sees. */
  @IsOptional()
  @IsUUID()
  userId?: string;
}
