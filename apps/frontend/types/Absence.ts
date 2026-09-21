import { PaginatedResponse, PaginationParams } from ".";
import { AbsenceType } from "./enums";

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
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbsencePayload {
  userId?: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  note?: string;
}

export type UpdateAbsencePayload = Partial<Omit<AbsencePayload, "userId">>;

export interface AbsencesQuery extends PaginationParams {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

export type AbsenceListResponse = PaginatedResponse<Absence>;
