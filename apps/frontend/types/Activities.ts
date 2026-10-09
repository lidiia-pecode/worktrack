import {
  ActivityCategoryResponse,
  PaginatedResponse,
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
  categoryId: string;
  defaultBillable?: boolean;
}

export interface ActivityQuery extends SearchablePaginationParams {
  status?: ActivityStatus;
}

export type UpdateActivityPayload = Partial<ActivityPayload>;
export interface ActivityListItem extends Activity {
  /** Active projects offering it; not sent to an employee. */
  projectsCount?: number;
}

export type ActivityListResponse = PaginatedResponse<ActivityListItem>;

/** The active projects that offer an activity now, which archiving takes it off. */
export interface RestoreActivityPayload {
  categoryId?: string;
}

export interface ActivityArchiveImpact {
  projects: { id: string; name: string }[];
}
