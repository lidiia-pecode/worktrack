import { PaginatedResponse, PaginationParams, ProjectActivity } from ".";
import { Company } from "./Company";
import { ProjectStatus } from "./enums";
import { User } from "./User";

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
  /** Only returned for a single project, never in list results. */
  users?: User[];
  /** Only returned in list results, where `users` is left out. */
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
