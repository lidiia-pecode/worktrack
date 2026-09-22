import { Project } from "./Project";

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
export interface PlanningQuery {
  userId?: string;
  projectId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
