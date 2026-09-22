import { PaginatedResponse, PaginationParams } from ".";
import { ProjectActivity } from "./ProjectActivities";

/**
 * Mirrors the backend `TimeLogResponse` DTO. Fields the API never serializes
 * (companyId, projectActivityId, company, user) are intentionally absent — the
 * type used to claim them, which made them look safe to read.
 */
export interface TimeLog {
  id: string;
  userId: string;
  isBillable: boolean;
  minutes: number;
  note?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Present on list, get and create. Absent on the update response when the
   * payload did not change `projectActivityId`, because the backend reloads
   * the row without the relation — so consumers must handle it missing.
   */
  projectActivity?: ProjectActivity;
}

export interface TimeLogPayload {
  userId?: string;
  projectActivityId: string;
  minutes: number;
  note?: string;
  isBillable?: boolean;
  date: string;
}

export type UpdateTimeLogPayload = Partial<Omit<TimeLogPayload, "userId">>;

export interface TimeLogsQuery extends PaginationParams {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  projectId?: string;
}

export type TimeLogListResponse = PaginatedResponse<TimeLog>;

/**
 * Params for the team summary. A type rather than an interface so it stays
 * assignable to the query-key params, and there is no pagination to omit.
 */
export type TeamSummaryQuery = {
  dateFrom: string;
  dateTo: string;
  teamId?: string;
  projectId?: string;
};

// Mirrors the backend `TeamSummaryResponse` DTO.
export interface TeamSummaryUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position?: string | null;
  avatarUrl?: string | null;
}

export interface TeamSummaryDay {
  date: string;
  minutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
}

export interface TeamSummaryRow {
  user: TeamSummaryUser;
  minutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  expectedMinutes: number;
  days: TeamSummaryDay[];
}

export interface TeamSummary {
  dateFrom: string;
  dateTo: string;
  minutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  rows: TeamSummaryRow[];
}
