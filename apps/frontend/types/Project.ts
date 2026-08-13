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
  users?: User[];
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

export interface ProjectQuery extends PaginationParams {
  status?: ProjectStatus;
}

export type ProjectListResponse = PaginatedResponse<Project>;
