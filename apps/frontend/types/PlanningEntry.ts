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
  note?: string;
}

// Query (back PlanningQueryDto)
export type PlanningQuery = PaginationParams & {
  userId?: string;
  projectId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
};

// Mirrors the backend `PlanningWeekResponse` DTO.
export type PlanningWeekQuery = {
  date: string;
  teamId?: string;
};

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
