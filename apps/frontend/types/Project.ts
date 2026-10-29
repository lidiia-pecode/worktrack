import {
  PaginatedResponse,
  ProjectActivity,
  SearchablePaginationParams,
} from ".";
import { Activity } from "./Activities";
import { Company } from "./Company";
import { ProjectStatus } from "./enums";
import { AssignableUser } from "./User";

/** A project as another entity's details list it. */
export interface ProjectRef {
  id: string;
  name: string;
  status: ProjectStatus;
}

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
  /** Linked but archived, so not offered; only a single project carries them. */
  archivedActivities?: Activity[];
}

/** What archiving a project removes: everyone's plans on it from today on. */
export interface ProjectArchiveImpact {
  people: AssignableUser[];
  planCount: number;
}

// ProjectPayload = back
export interface ProjectPayload {
  name: string;
  clientName?: string | null;
  description?: string;
}

export type UpdateProjectPayload = Partial<ProjectPayload>;

export interface ProjectsQuery extends SearchablePaginationParams {
  status?: ProjectStatus;
}

export type ProjectListResponse = PaginatedResponse<Project>;
