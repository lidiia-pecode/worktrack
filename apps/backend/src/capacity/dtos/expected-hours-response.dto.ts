import { Exclude, Expose } from 'class-transformer';

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
}
