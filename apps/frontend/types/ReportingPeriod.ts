import { ReportingMonthState } from "./enums";

export interface ReportingMonth {
  /** YYYY-MM */
  month: string;
  state: ReportingMonthState;
  /** The last editable day while the month is open or in its grace window. */
  editableUntil: string | null;
}

export interface ReportingPeriodsQuery {
  /** YYYY-MM */
  from?: string;
  /** YYYY-MM */
  to?: string;
}
