import { PaginatedResponse, PaginationParams, ProjectActivity } from ".";
import { Status as ProjectStatus, Status } from "./enums";
import { User } from "./User";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  users: User[];
  projectActivities: ProjectActivity[];
  owner: User;
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

export interface ProjectQuery extends PaginationParams {
  status?: Status;
}

export type ProjectListResponse = PaginatedResponse<Project>;
