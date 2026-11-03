import { UserRole, UserStatus } from "./enums";
import { TeamMove } from "./Timelog";
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

/** A team they were in during the period, with their figures on its days. */
export interface ReportTeam {
  id: string;
  name: string;
  figures: PeopleReportFigures;
  /** Where they joined or left the team inside the period. */
  moves: TeamMove[];
}

export interface PeopleReportRow extends PeopleReportFigures {
  userId: string;
  name: string;
  position: string | null;
  role: UserRole;
  /** A deactivated person is listed while their time counts in the range. */
  status: UserStatus;
  /** The active teams they were in during the period, by name; for a manager, only the teams they lead. */
  teams: ReportTeam[];
  /** Finished days they were expected to work and logged nothing, in date order. */
  daysWithoutTime: string[];
}

export interface PeopleReport extends ReportCoverage {
  rows: PeopleReportRow[];
  totals: PeopleReportFigures;
}

export type TimelineBucketSize = "week" | "month";

/** One week or month of the range, cut to the days it counts. */
export interface TimelineBucket {
  start: string;
  end: string;
  /** Working days among the days it counts. */
  workingDays: number;
  /** True when the range or the cut-off leaves part of the week or month out. */
  isPartial: boolean;
  loggedMinutes: number;
  billableMinutes: number;
  plannedMinutes: number;
  expectedMinutes: number;
}

export interface Timeline extends ReportCoverage {
  /** Weeks up to 92 days, months beyond. */
  bucketSize: TimelineBucketSize;
  /** Oldest first, up to the last day counted. */
  buckets: TimelineBucket[];
}

/** What Reports opens with: the People report and its timeline, worked out together. */
export interface ReportOverview {
  people: PeopleReport;
  timeline: Timeline;
}
