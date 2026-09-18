import { PaginatedResponse, PaginationParams } from ".";
import { Activity } from "./Activities";
import { Company } from "./Company";

// simplified back responce ProjectActivityResponse
export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
}

export interface ProjectActivity {
  id: string;
  companyId: string;
  projectId: string;
  activityId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  project?: ProjectSummary;
  activity?: Activity;
}

export interface ProjectActivityPayload {
  activityId: string;
}

export type UpdateProjectActivityPayload = {
  isActive?: boolean;
};

export type ProjectActivityListResponse = PaginatedResponse<ProjectActivity>;

/**
 * Params for the assignable-activities route. `userId` asks for someone else's
 * projects and is open to owners and managers within their own scope.
 */
export type AssignableActivitiesQuery = PaginationParams & {
  userId?: string;
};
