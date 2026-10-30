import { PaginationParams } from ".";
import { Project } from "./Project";
import { TeamSummaryUser } from "./Timelog";

export interface PlanningEntry {
  id: string;
  userId: string;
  createdById?: string | null;
  project: Project;
  plannedMinutes: number;
  note?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// Payload (back CreatePlanningEntryDto)
export interface CreatePlanningEntryPayload {
  userId: string;
  projectId: string;
  date: string;
  plannedMinutes: number;
  note?: string;
}

// Payload (back UpdatePlanningEntryDto)
export interface UpdatePlanningEntryPayload {
  projectId?: string;
  date?: string;
  plannedMinutes?: number;
  note?: string | null;
}

// Payload (back PlanPeriodPayload)
export interface PlanPeriodPayload {
  userId: string;
  startDate: string;
  endDate: string;
  projects: {
    projectId: string;
    minutesPerDay: number;
    /** Only the days that already have the project; otherwise every working day. */
    existingDaysOnly?: boolean;
  }[];
}

// Query (back DeletePeriodPlansQuery)
export interface DeletePeriodPlansQuery {
  userId: string;
  projectId: string;
  startDate: string;
  endDate: string;
}

export interface PlannedPeriod {
  days: number;
  created: number;
  updated: number;
}

// Response (back PeriodPreview): the same plan checked, not saved
export interface PeriodPreview {
  /** The working days the plan would cover. */
  plannedDays: string[];
  /** Every day and week the plan would take over its limit. */
  problems: string[];
  /** How many plans saving would add and change, per listed project. */
  changes: { projectId: string; added: number; changed: number }[];
}

// Query (back PlanningQueryDto)
export type PlanningQuery = PaginationParams & {
  userId?: string;
  projectId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PlanningWeekQuery = {
  date: string;
  teamId?: string;
};

// Mirrors the backend `PlanningWeekResponse` DTO.
export interface PlanningProjectOption {
  id: string;
  name: string;
}

export interface PlanningWeekRow {
  user: TeamSummaryUser;
  plannedMinutes: number;
  availableMinutes: number;
  projects: PlanningProjectOption[];
  entries: PlanningEntry[];
}

export interface PlanningWeek {
  weekStart: string;
  weekEnd: string;
  dayLimitMinutes: number;
  rows: PlanningWeekRow[];
}

export type PlanningRemovalCountQuery = {
  projectIds: string[];
  userIds: string[];
};
