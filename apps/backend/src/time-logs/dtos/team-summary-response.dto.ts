import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class TeamSummaryUserResponse {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  position?: string;

  @Expose()
  avatarUrl?: string;
}

@Exclude()
export class TeamSummaryDayResponse {
  @Expose()
  date!: string;

  @Expose()
  minutes!: number;

  @Expose()
  billableMinutes!: number;

  @Expose()
  nonBillableMinutes!: number;
}

@Exclude()
export class TeamSummaryRowResponse {
  @Expose()
  @Type(() => TeamSummaryUserResponse)
  user!: TeamSummaryUserResponse;

  @Expose()
  minutes!: number;

  @Expose()
  billableMinutes!: number;

  @Expose()
  nonBillableMinutes!: number;

  @Expose()
  expectedMinutes!: number;

  @Expose()
  @Type(() => TeamSummaryDayResponse)
  days!: TeamSummaryDayResponse[];
}

@Exclude()
export class TeamSummaryResponse {
  @Expose()
  dateFrom!: string;

  @Expose()
  dateTo!: string;

  @Expose()
  minutes!: number;

  @Expose()
  billableMinutes!: number;

  @Expose()
  nonBillableMinutes!: number;

  @Expose()
  @Type(() => TeamSummaryRowResponse)
  rows!: TeamSummaryRowResponse[];
}
