import { PaginatedResponse } from ".";
import { ProjectStatus } from "./enums";
import { User } from "./User";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  users: User[];
  updatedAt: string;
  createdAt: string;
}

export type ProjectPayload = {
  name: string;
  description?: string;
  userIds?: string[];
};

export type UpdateProjectPayload = Partial<ProjectPayload>;

export type ProjectState = Pick<Project, "name"> & {
  description?: string;
};

export type ProjectListResponse = PaginatedResponse<Project>;
