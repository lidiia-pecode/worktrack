import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

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

  /** Only time and plans for this client, by the report's case-insensitive client rule. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  client?: string;

  /** Only internal work: projects with no client. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  withoutClient?: boolean;

  /** Only this person's time and plans, within the people the caller sees. */
  @IsOptional()
  @IsUUID()
  userId?: string;
}
