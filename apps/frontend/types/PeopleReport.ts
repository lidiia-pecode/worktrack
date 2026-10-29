import { UserRole, UserStatus } from "./enums";
import { ReportCoverage } from "./HoursReport";

export interface PeopleReportFigures {
  loggedMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  plannedMinutes: number;
  /** Capacity minus time off, over the same finished days. */
  expectedMinutes: number;
  /** Working days an absence covered among those days. */
  timeOffDays: number;
}

export interface ReportTeam {
  id: string;
  name: string;
}

export interface PeopleReportRow extends PeopleReportFigures {
  userId: string;
  name: string;
  position: string | null;
  role: UserRole;
  /** A deactivated person is listed while their time counts in the range. */
  status: UserStatus;
  /** Their active teams, by name; for a manager, only the teams they lead. */
  teams: ReportTeam[];
  /** Finished days they were expected to work and logged nothing, in date order. */
  daysWithoutTime: string[];
}

export interface PeopleReport extends ReportCoverage {
  rows: PeopleReportRow[];
  totals: PeopleReportFigures;
}

/** One week of the range, cut to the days it counts. */
export interface TimelineBucket {
  start: string;
  end: string;
  /** Working days among the days it counts. */
  workingDays: number;
  /** True when the range or the cut-off leaves part of the week out. */
  isPartial: boolean;
  loggedMinutes: number;
  billableMinutes: number;
  plannedMinutes: number;
  expectedMinutes: number;
}

export interface Timeline extends ReportCoverage {
  /** Oldest first, up to the last day counted. */
  buckets: TimelineBucket[];
}
