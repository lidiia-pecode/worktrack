import { ReportCoverage } from "./HoursReport";

export interface PlannedVsActualRow {
  userId: string;
  name: string;
  position: string | null;
  plannedMinutes: number;
  loggedMinutes: number;
}

export interface PlannedVsActualReport extends ReportCoverage {
  rows: PlannedVsActualRow[];
  totals: { plannedMinutes: number; loggedMinutes: number };
}

export interface PlannedVsActualQuery {
  dateFrom: string;
  dateTo: string;
}
