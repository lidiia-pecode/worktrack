import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class ExpectedDayResponse {
  @Expose()
  date!: string;

  @Expose()
  minutes!: number;
}

@Exclude()
export class ExpectedHoursResponse {
  @Expose()
  dateFrom!: string;

  @Expose()
  dateTo!: string;

  @Expose()
  expectedMinutes!: number;

  /** Only days that have finished — what "behind" is measured against. */
  @Expose()
  expectedToDateMinutes!: number;

  /** Every date in the range; the days add up to `expectedMinutes`. */
  @Expose()
  @Type(() => ExpectedDayResponse)
  expectedByDate!: ExpectedDayResponse[];
}
