import { IsOptional, IsUUID } from 'class-validator';

import { ReportRangeQuery } from '../../dtos/report-range-query.dto';

export class PeopleReportQuery extends ReportRangeQuery {
  /** One person's row, within the people the caller sees. */
  @IsOptional()
  @IsUUID()
  userId?: string;
}
