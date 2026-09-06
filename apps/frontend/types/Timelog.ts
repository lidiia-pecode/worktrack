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
  projectActivityId: string;
  minutes: number;
  note?: string;
  isBillable?: boolean;
  date: string;
}

export type UpdateTimeLogPayload = Partial<TimeLogPayload>;

export interface TimeLogsQuery extends PaginationParams {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  projectId?: string;
}

export type TimeLogListResponse = PaginatedResponse<TimeLog>;
