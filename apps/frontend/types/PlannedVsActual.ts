export interface PlannedVsActualRow {
  userId: string;
  name: string;
  position: string | null;
  plannedMinutes: number;
  loggedMinutes: number;
}

export interface PlannedVsActualReport {
  rows: PlannedVsActualRow[];
  totals: { plannedMinutes: number; loggedMinutes: number };
  /** True while any month in the range can still be edited. */
  isProvisional: boolean;
}

export interface PlannedVsActualQuery {
  dateFrom: string;
  dateTo: string;
}
