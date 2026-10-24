import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';
import { HoursReportGroupBy } from '../enums/hours-report-group-by.enum';

export class HoursReportQuery {
  @IsDateWithoutTimeString()
  dateFrom!: string;

  @IsDateWithoutTimeString()
  dateTo!: string;

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
