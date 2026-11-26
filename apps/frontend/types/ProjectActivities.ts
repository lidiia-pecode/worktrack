import { PaginatedResponse, PaginationParams } from ".";
import { Activity } from "./Activities";
import { ProjectStatus } from "./enums";

/** A project as the API sends it inside a project's activity. */
export interface ProjectSummary {
  id: string;
  name: string;
  /** Null or empty for an internal project. */
  clientName: string | null;
  status: ProjectStatus;
}

export interface ProjectActivity {
  id: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  project?: ProjectSummary;
  activity?: Activity;
}

export type ProjectActivityListResponse = PaginatedResponse<ProjectActivity>;

/**
 * Params for the assignable-activities route. `userId` asks for someone else's
 * projects and is open to owners and managers within their own scope.
 */
export type AssignableActivitiesQuery = PaginationParams & {
  userId?: string;
};
