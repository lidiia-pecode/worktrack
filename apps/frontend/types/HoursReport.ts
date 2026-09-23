import { HoursReportGroupBy } from "./enums";

export interface HoursSplit {
  /** Client work marked billable. */
  billableMinutes: number;
  /** Client work not marked billable. */
  nonBillableMinutes: number;
  /** Work on projects with no client. */
  internalMinutes: number;
  totalMinutes: number;
}

export interface HoursReportRow extends HoursSplit {
  /** The project, activity or person id; null when grouped by client. */
  id: string | null;
  /** Null only for internal work when grouped by client. */
  name: string | null;
  /** The client for a project, the category for an activity, the position for a person. */
  detail: string | null;
}

export interface HoursReport {
  rows: HoursReportRow[];
  totals: HoursSplit;
  /** True while any month in the range can still be edited. */
  isProvisional: boolean;
}

export interface HoursReportQuery {
  dateFrom: string;
  dateTo: string;
  groupBy: HoursReportGroupBy;
}
