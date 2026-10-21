import { HoursReportGroupBy } from "./enums";

export interface HoursSplit {
  /** Time marked billable, on any project. */
  billableMinutes: number;
  /** Time not marked billable, on any project. */
  nonBillableMinutes: number;
  totalMinutes: number;
}

export interface HoursReportRow extends HoursSplit {
  /** The project, activity or person id; null when grouped by client. */
  id: string | null;
  /** Null only for internal work when grouped by client. */
  name: string | null;
  /** The client for a project, the category for an activity, the position for a person. */
  detail: string | null;
  /** Planned for the same days; null by activity, which plans don't have. */
  plannedMinutes: number | null;
  /** The people who logged or planned time on it; only by project or client. */
  peopleCount: number | null;
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
  totals: HoursSplit & Pick<HoursReportRow, "plannedMinutes" | "peopleCount">;
}

export interface HoursExportQuery {
  dateFrom: string;
  dateTo: string;
}

export interface HoursReportQuery {
  dateFrom: string;
  dateTo: string;
  groupBy: HoursReportGroupBy;
  /** Only this project's time and plans. */
  projectId?: string;
  /** Only this client's time and plans. */
  client?: string;
  /** Only internal work: projects with no client. */
  withoutClient?: boolean;
}
