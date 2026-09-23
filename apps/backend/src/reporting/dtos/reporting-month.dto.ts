import { IsOptional, Matches } from 'class-validator';

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_MESSAGE = 'must be a month in YYYY-MM format';

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
