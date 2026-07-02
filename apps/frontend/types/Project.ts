import { ProjectStatus } from "./enums";
import { User } from "./User";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  estimate: number;
  users: User[];
  updated_at: Date;
  created_at: Date;
}

export type ProjectPayload = {
  name: string;
  status: ProjectStatus;
  estimate: number;
  description?: string;
  userIds?: string[];
};

export type UpdateProjectPayload = Partial<ProjectPayload>;

export type ProjectResponse = {
  count: number;
  next: number | null;
  previous: number | null;
  results: Project[];
};

export type ProjectState = Pick<Project, "name" | "status" | "estimate"> & {
  description: string;
};
