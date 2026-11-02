import { Exclude, Expose, Type } from 'class-transformer';

import { TeamSummaryUserResponse } from 'src/time-logs/dtos/team-summary-response.dto';
import { PlanningEntryResponse } from './planning-entry-response.dto';

@Exclude()
export class PlanningProjectOptionResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;
}

@Exclude()
export class PlanningDayLimitResponse {
  @Expose()
  date!: string;

  @Expose()
  minutes!: number;
}

@Exclude()
export class PlanningWeekRowResponse {
  @Expose()
  @Type(() => TeamSummaryUserResponse)
  user!: TeamSummaryUserResponse;

  @Expose()
  plannedMinutes!: number;

  @Expose()
  availableMinutes!: number;

  /** The most the person can be planned on each day of the week. */
  @Expose()
  @Type(() => PlanningDayLimitResponse)
  dayLimits!: PlanningDayLimitResponse[];

  @Expose()
  @Type(() => PlanningProjectOptionResponse)
  projects!: PlanningProjectOptionResponse[];

  @Expose()
  @Type(() => PlanningEntryResponse)
  entries!: PlanningEntryResponse[];
}

@Exclude()
export class PlanningWeekResponse {
  @Expose()
  weekStart!: string;

  @Expose()
  weekEnd!: string;

  @Expose()
  @Type(() => PlanningWeekRowResponse)
  rows!: PlanningWeekRowResponse[];
}
