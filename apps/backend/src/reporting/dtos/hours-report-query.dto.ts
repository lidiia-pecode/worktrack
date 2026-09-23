import { IsEnum } from 'class-validator';

import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';
import { HoursReportGroupBy } from '../enums/hours-report-group-by.enum';

export class HoursReportQuery {
  @IsDateWithoutTimeString()
  dateFrom!: string;

  @IsDateWithoutTimeString()
  dateTo!: string;

  @IsEnum(HoursReportGroupBy)
  groupBy!: HoursReportGroupBy;
}
