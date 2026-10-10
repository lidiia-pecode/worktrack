import {
  ActivityCategoryResponse,
  PaginatedResponse,
  SearchablePaginationParams,
} from ".";
import { ActivityStatus, ProjectStatus } from "./enums";

export interface Activity {
  id: string;
  companyId: string;
  name: string;
  defaultBillable: boolean;
  status: ActivityStatus;
  /** None while it is a draft, which cannot go on a project yet. */
  category: ActivityCategoryResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityPayload {
  name: string;
  /** Null for a draft; on an update, null takes the category away. */
  categoryId: string | null;
  defaultBillable?: boolean;
}

export interface ActivityQuery extends SearchablePaginationParams {
  status?: ActivityStatus;
}

export type UpdateActivityPayload = Partial<ActivityPayload>;
export interface ActivityProject {
  id: string;
  name: string;
  status: ProjectStatus;
}

export interface ActivityDetails extends Activity {
  /** Projects of every status that offer it; not sent to an employee. */
  projects?: ActivityProject[];
}

export interface ActivityListItem extends Activity {
  /** Active projects offering it; not sent to an employee. */
  projectsCount?: number;
}

export type ActivityListResponse = PaginatedResponse<ActivityListItem>;

/** The active projects that offer an activity now, which archiving takes it off. */
export interface RestoreActivityPayload {
  categoryId?: string;
  /** Back as a draft, which only an activity on no project may be. */
  withoutCategory?: boolean;
}

export interface ActivityArchiveImpact {
  projects: { id: string; name: string }[];
}
