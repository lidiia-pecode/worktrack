import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ExpectedHoursResponse {
  @Expose()
  dateFrom!: string;

  @Expose()
  dateTo!: string;

  @Expose()
  expectedMinutes!: number;
}
