import { UserStatus } from "./enums";
import { TeamMove } from "./Timelog";
import { ReportCoverage } from "./HoursReport";

export interface PeopleReportFigures {
  loggedMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  plannedMinutes: number;
  /** Capacity minus time off, over the same finished days. */
  expectedMinutes: number;
  /** Working days with working hours an absence covered among those days. */
  timeOffDays: number;
}

/** Some of a person's days in the period, with their figures on those days. */
export interface ReportPart {
  figures: PeopleReportFigures;
  /** The days of the period it covers, each up to the day before `until`. */
  spans: { from: string; until: string }[];
  /** Where its days start or stop inside the period. */
  moves: TeamMove[];
}

/** A team they were in during the period, with their figures on its days. */
export interface ReportTeam extends ReportPart {
  id: string;
  name: string;
  /** Archived since; only the owner sees one, as nobody leads it. */
  isArchived: boolean;
}

export interface PeopleReportRow extends PeopleReportFigures {
  userId: string;
  name: string;
  position: string | null;
  /** A deactivated person is listed while they had days in the range. */
  status: UserStatus;
  /** The teams they were in during the period, by name, archived ones included; for a manager, only the teams they lead. */
  teams: ReportTeam[];
  /** The days the view holds that no listed team covers; null under a team filter, or when nothing is on those days. */
  outsideTeams: ReportPart | null;
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
