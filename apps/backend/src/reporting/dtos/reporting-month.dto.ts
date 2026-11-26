import { IsOptional, Matches } from 'class-validator';

// The years a date may have (IsDateWithoutTimeString): 2000 to 2100.
const MONTH_KEY = /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/;
const MONTH_MESSAGE = 'must be a month in YYYY-MM format, from 2000 to 2100';

export class ReportingMonthParam {
  @Matches(MONTH_KEY, { message: `month ${MONTH_MESSAGE}` })
  month!: string;
}

export class ReportingPeriodsQuery {
  @IsOptional()
  @Matches(MONTH_KEY, { message: `from ${MONTH_MESSAGE}` })
  from?: string;

  @IsOptional()
  @Matches(MONTH_KEY, { message: `to ${MONTH_MESSAGE}` })
  to?: string;
}
