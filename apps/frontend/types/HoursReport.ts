import { HoursReportGroupBy } from "./enums";

export interface HoursSplit {
  /** Time marked billable, on any project. */
  billableMinutes: number;
  /** Time not marked billable, on any project. */
  nonBillableMinutes: number;
  totalMinutes: number;
}

export interface HoursReportRow extends HoursSplit {
  /** The project, activity or person id. */
  id: string;
  name: string;
  /** The client for a project, the category for an activity, the position for a person. */
  detail: string | null;
  /** Planned for the same days; null by activity, which plans don't have. */
  plannedMinutes: number | null;
}

/** What every report returns besides its rows and totals. */
export interface ReportCoverage {
  /** True while any month in the range can still be edited. */
  isProvisional: boolean;
  /**
   * The last day counted when the range reaches today or later, since only
   * finished days count; null when the whole range was counted.
   */
  countedUntil: string | null;
}

export interface HoursReport extends ReportCoverage {
  /** The grouping these rows were built with. */
  groupBy: HoursReportGroupBy;
  rows: HoursReportRow[];
  totals: HoursSplit & Pick<HoursReportRow, "plannedMinutes">;
}

/** The days a report covers: one month on Reports. */
export interface ReportRange {
  dateFrom: string;
  dateTo: string;
}

export interface HoursReportQuery extends ReportRange {
  groupBy: HoursReportGroupBy;
  /** Only this project's time and plans. */
  projectId?: string;
  /** Only this person's time and plans. */
  userId?: string;
}
