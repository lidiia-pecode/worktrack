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

export interface PeopleReportRow extends PeopleReportFigures {
  userId: string;
  name: string;
  position: string | null;
}

export interface PeopleReport extends ReportCoverage {
  rows: PeopleReportRow[];
  totals: PeopleReportFigures;
}

export interface PeopleReportQuery {
  dateFrom: string;
  dateTo: string;
}
