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
  /** Finished days they were expected to work and logged nothing, in date order. */
  daysWithoutTime: string[];
}

export interface PeopleReport extends ReportCoverage {
  rows: PeopleReportRow[];
  totals: PeopleReportFigures & {
    /** How many days without time there are across the rows. */
    daysWithoutTime: number;
  };
}

export interface PeopleReportQuery {
  dateFrom: string;
  dateTo: string;
}
