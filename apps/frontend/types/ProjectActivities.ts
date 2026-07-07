import { PaginatedResponse } from ".";
import { Activity } from "./Activities";
import { Project } from "./Project";

export interface ProjectActivity {
  id: string;
  project: Project;
  activity: Activity;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectActivityPayload {
  activityId: string;
}

export type UpdateProjectActivityPayload = {
  isActive?: boolean;
};

export type ProjectActivityListResponse = PaginatedResponse<ProjectActivity>;
