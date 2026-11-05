export interface ExpectedDay {
  date: string;
  minutes: number;
}

/** Mirrors the backend `ExpectedHoursResponse` DTO. */
export interface ExpectedHours {
  dateFrom: string;
  dateTo: string;
  expectedMinutes: number;
  expectedToDateMinutes: number;
  /** Every date in the range; the days add up to `expectedMinutes`. */
  expectedByDate: ExpectedDay[];
}

export type ExpectedHoursQuery = {
  dateFrom: string;
  dateTo: string;
};

export interface CapacityChange {
  validFrom: string;
  minutesPerWeek: number;
}

/** Mirrors the backend `CapacityResponse` DTO. */
export interface Capacity {
  userId: string;
  minutesPerWeek: number;
  validFrom: string | null;
  isCompanyDefault: boolean;
  /** The change that starts after today; there is at most one. */
  upcoming: CapacityChange | null;
}

export interface SetCapacityPayload {
  userId: string;
  minutesPerWeek: number;
  validFrom: string;
}
