import { PaginatedResponse, ProjectActivity } from ".";
import { Status as ProjectStatus } from "./enums";
import { User } from "./User";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  users: User[];
  projectActivities: ProjectActivity[];
  updatedAt: string;
  createdAt: string;
}

export type ProjectPayload = {
  name: string;
  description?: string;
  userIds?: string[];
  activityIds?: string[];
};

export type UpdateProjectPayload = Partial<ProjectPayload>;

export type ProjectState = Pick<Project, "name"> & {
  description?: string;
};

export type ProjectListResponse = PaginatedResponse<Project>;
