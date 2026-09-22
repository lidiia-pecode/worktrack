/** Mirrors the backend `ExpectedHoursResponse` DTO. */
export interface ExpectedHours {
  dateFrom: string;
  dateTo: string;
  expectedMinutes: number;
}

export type ExpectedHoursQuery = {
  dateFrom: string;
  dateTo: string;
};
