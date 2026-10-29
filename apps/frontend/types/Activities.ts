import {
  ActivityCategoryResponse,
  PaginatedResponse,
  ProjectRef,
  SearchablePaginationParams,
} from ".";
import { ActivityStatus } from "./enums";

export interface Activity {
  id: string;
  companyId: string;
  name: string;
  defaultBillable: boolean;
  status: ActivityStatus;
  category: ActivityCategoryResponse;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityPayload {
  name: string;
  /** Every activity is in a category; it is moved or archived, never left without one. */
  categoryId: string;
  defaultBillable?: boolean;
}

export interface ActivityQuery extends SearchablePaginationParams {
  status?: ActivityStatus;
}

export type UpdateActivityPayload = Partial<ActivityPayload>;

export interface ActivityDetails extends Activity {
  /** Projects of every status that offer it; not sent to an employee. */
  projects?: ProjectRef[];
}

export interface ActivityListItem extends Activity {
  /** Active projects offering it; not sent to an employee. */
  projectsCount?: number;
}

export type ActivityListResponse = PaginatedResponse<ActivityListItem>;

export interface RestoreActivityPayload {
  categoryId?: string;
}

/** The active projects that offer an activity now, which archiving takes it off. */
export interface ActivityArchiveImpact {
  projects: { id: string; name: string }[];
}
