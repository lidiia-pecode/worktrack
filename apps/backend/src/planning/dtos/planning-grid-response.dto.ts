import { Exclude, Expose, Type } from 'class-transformer';

import {
  ClosedSpellResponse,
  TeamMoveResponse,
  TeamSummaryUserResponse,
} from 'src/time-logs/dtos/team-summary-response.dto';
import { PlanningEntryResponse } from './planning-entry-response.dto';

@Exclude()
export class PlanningProjectOptionResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;
}

@Exclude()
export class PlanningDayMinutesResponse {
  @Expose()
  date!: string;

  @Expose()
  minutes!: number;
}

@Exclude()
export class PlanningRowResponse {
  @Expose()
  @Type(() => TeamSummaryUserResponse)
  user!: TeamSummaryUserResponse;

  @Expose()
  plannedMinutes!: number;

  @Expose()
  availableMinutes!: number;

  @Expose()
  @Type(() => PlanningDayMinutesResponse)
  availableByDay!: PlanningDayMinutesResponse[];

  /** The most the person can be planned on each day. */
  @Expose()
  @Type(() => PlanningDayMinutesResponse)
  dayLimits!: PlanningDayMinutesResponse[];

  @Expose()
  @Type(() => PlanningProjectOptionResponse)
  projects!: PlanningProjectOptionResponse[];

  @Expose()
  @Type(() => PlanningEntryResponse)
  entries!: PlanningEntryResponse[];

  /** The days the viewer can't touch, as on the team summary. */
  @Expose()
  @Type(() => ClosedSpellResponse)
  closedSpells!: ClosedSpellResponse[];

  @Expose()
  @Type(() => TeamMoveResponse)
  moves!: TeamMoveResponse[];
}

/** What a week and a month share: one row per person over their days. */
@Exclude()
class PlanningGridResponse {
  @Expose()
  @Type(() => PlanningRowResponse)
  rows!: PlanningRowResponse[];
}

@Exclude()
export class PlanningWeekResponse extends PlanningGridResponse {
  @Expose()
  weekStart!: string;

  @Expose()
  weekEnd!: string;
}

@Exclude()
export class PlanningMonthResponse extends PlanningGridResponse {
  @Expose()
  monthStart!: string;

  @Expose()
  monthEnd!: string;
}
