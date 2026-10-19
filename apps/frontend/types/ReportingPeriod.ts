import { ReportingMonthState } from "./enums";

export interface ReportingMonth {
  /** YYYY-MM */
  month: string;
  state: ReportingMonthState;
  /** The last editable day while the month is open or in its grace window. */
  editableUntil: string | null;
  /** Who last reopened or closed the month by hand; null while nobody has. */
  changedBy: string | null;
  /** When that happened (ISO 8601); null while nobody has. */
  changedAt: string | null;
}

export interface ReportingPeriodsQuery {
  /** YYYY-MM */
  from?: string;
  /** YYYY-MM */
  to?: string;
}
