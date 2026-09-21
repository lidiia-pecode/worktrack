import { PaginatedResponse, PaginationParams, ProjectActivity } from ".";
import { Company } from "./Company";
import { ProjectStatus } from "./enums";
import { AssignableUser } from "./User";

export interface Project {
  id: string;
  companyId: string;
  name: string;
  clientName?: string | null;
  description?: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  projectActivities?: ProjectActivity[];
  /**
   * Only returned for a single project, never in list results, and scoped to
   * the caller — a manager reads their own people and nobody else's.
   */
  users?: AssignableUser[];
  /** The project's true size, which `users` can be shorter than. */
  membersCount?: number;
}

// ProjectPayload = back
export interface ProjectPayload {
  name: string;
  clientName?: string | null;
  description?: string;
  activityIds?: string[];
  userIds?: string[];
}

export type UpdateProjectPayload = Partial<ProjectPayload>;

export interface ProjectsQuery extends PaginationParams {
  status?: ProjectStatus;
}

export type ProjectListResponse = PaginatedResponse<Project>;
