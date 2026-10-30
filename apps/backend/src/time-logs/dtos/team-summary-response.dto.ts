import { Exclude, Expose, Type } from 'class-transformer';

import { ExpectedDayResponse } from 'src/capacity/dtos/expected-hours-response.dto';
import { UserStatus } from 'src/users/enums/user-role.enum';
import { TimeLogResponse } from './time-log-response.dto';

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

  @Expose()
  status!: UserStatus;

  /** When they were deactivated, so the grid knows which days came before. */
  @Expose()
  deactivatedAt!: Date | null;
}

@Exclude()
export class InactiveSpellResponse {
  @Expose()
  from!: string;

  /** The day they came back; null while they are still deactivated. */
  @Expose()
  until!: string | null;
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

  /** Only with `includeEntries`. */
  @Expose()
  @Type(() => TimeLogResponse)
  entries?: TimeLogResponse[];
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
  expectedToDateMinutes!: number;

  @Expose()
  @Type(() => ExpectedDayResponse)
  expectedByDate!: ExpectedDayResponse[];

  /** The days nothing can be recorded on, in the company's time zone. */
  @Expose()
  @Type(() => InactiveSpellResponse)
  inactiveSpells!: InactiveSpellResponse[];

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
