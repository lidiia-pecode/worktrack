import { PaginatedResponse, PaginationParams } from ".";
import { UserStatus } from "./enums";
import { ExpectedDay } from "./Capacity";
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
  /** null clears a saved note on update. */
  note?: string | null;
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
  userId?: string;
  /** Each day also lists its entries. */
  includeEntries?: boolean;
};

// Mirrors the backend `TeamSummaryResponse` DTO.
export interface TeamSummaryUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position?: string | null;
  avatarUrl?: string | null;
  status: UserStatus;
  deactivatedAt: string | null;
}

/** Deactivated from `from` up to the day before `until`; `until` is null while they still are. */
export interface InactiveSpell {
  from: string;
  until: string | null;
}

export interface TeamSummaryDay {
  date: string;
  minutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  /** Only when asked for with `includeEntries`, in the order they were logged. */
  entries?: TimeLog[];
}

export interface TeamSummaryRow {
  user: TeamSummaryUser;
  minutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  expectedMinutes: number;
  expectedToDateMinutes: number;
  /** Every date of the range, so a day over the person's hours can be marked. */
  expectedByDate: ExpectedDay[];
  /** The days nothing can be recorded on, in the company's time zone. */
  inactiveSpells: InactiveSpell[];
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
