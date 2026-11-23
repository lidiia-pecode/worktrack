import { PaginatedResponse, PaginationParams } from ".";
import { AbsenceType } from "./enums";
import { UserName } from "./User";

/**
 * Mirrors the backend `AbsenceResponse` DTO. An absence covers a whole range
 * of days, so a two-week holiday is one of these rather than fourteen.
 */
export interface Absence {
  id: string;
  userId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  /** Part of one day, in minutes; null for a whole day or days. */
  minutes: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Who added it; null for records from before this was kept. On reads only. */
  createdBy?: UserName | null;
  /** Who last changed it; null until it is changed. On reads only. */
  updatedBy?: UserName | null;
  /**
   * Whether the viewer may change it: every day of it within their reach,
   * their own, or an owner's. On a list only.
   */
  canChange?: boolean;
}

export interface AbsencePayload {
  userId?: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  /** Part of one day; null makes it a whole day on update. */
  minutes?: number | null;
  /** null clears a saved note on update. */
  note?: string | null;
}

export type UpdateAbsencePayload = Partial<Omit<AbsencePayload, "userId">>;

/** `trimmed` when only its open days went, its days in a locked month kept. */
export interface AbsenceDeleteResult {
  success: boolean;
  trimmed: boolean;
}

export interface AbsencesQuery extends PaginationParams {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  /** Only the absences of people in this team on the absence's days. */
  teamId?: string;
}

export type AbsenceListResponse = PaginatedResponse<Absence>;

/** Mirrors the backend `AbsenceDay`: a person's day, for part of it to be measured against. */
export interface AbsenceDay {
  date: string;
  workingMinutes: number;
  loggedMinutes: number;
  plannedMinutes: number;
}

export interface AbsenceDayQuery {
  date: string;
  userId?: string;
}
