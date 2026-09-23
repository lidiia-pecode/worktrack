export interface UtilisationFigures {
  capacityMinutes: number;
  absenceMinutes: number;
  availableMinutes: number;
  loggedMinutes: number;
  billableMinutes: number;
  /** Billable and non-billable client work together. */
  clientMinutes: number;
  nonBillableClientMinutes: number;
  /** Billable ÷ available. Null when nothing was available. */
  billableUtilisation: number | null;
  /** Client ÷ logged. Null when nothing was logged. */
  clientShare: number | null;
  /** Non-billable client ÷ client. Null when there was no client work. */
  nonBillableClientShare: number | null;
  /** Logged ÷ expected. Null when nothing was expected. */
  loggingCompleteness: number | null;
}

export interface UtilisationRow extends UtilisationFigures {
  userId: string;
  name: string;
  position: string | null;
}

export interface UtilisationReport {
  rows: UtilisationRow[];
  totals: UtilisationFigures;
  /** True while any month in the range can still be edited. */
  isProvisional: boolean;
}

export interface UtilisationQuery {
  dateFrom: string;
  dateTo: string;
}
