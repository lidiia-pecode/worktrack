import { Activity, PaginatedResponse, SearchablePaginationParams } from ".";
import { Company } from "./Company";
import {
  ActCategoryStatus,
  ActiveActivitiesAction,
  ActivityStatus,
  ArchivedActivitiesAction,
} from "./enums";

export interface ActivityCategoryResponse {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityCategory {
  id: string;
  companyId: string;
  name: string;
  status: ActCategoryStatus;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  activities?: Activity[];
}

export interface ActivityCategoryPayload {
  name: string;
}

export interface ActivityCategoryQuery extends SearchablePaginationParams {
  status?: ActCategoryStatus;
}

export interface ArchiveActivityCategoryPayload {
  activities?: ActiveActivitiesAction;
  moveToCategoryId?: string;
}

/** Without `activities`, the category comes back alone. */
export interface RestoreActivityCategoryPayload {
  activities?: ArchivedActivitiesAction;
}

export interface ActivityCategoryArchiveImpact {
  activities: {
    id: string;
    name: string;
    projects: { id: string; name: string }[];
  }[];
}

export type UpdateActivityCategoryPayload = Partial<ActivityCategoryPayload>;
/** What a category's own form and dialogs need, from a list row or its details. */
export type ActivityCategorySummary = Pick<
  ActivityCategory,
  "id" | "name" | "status"
>;

export interface CategoryActivity {
  id: string;
  name: string;
  status: ActivityStatus;
}

export interface ActivityCategoryDetails extends Omit<
  ActivityCategory,
  "activities"
> {
  /** Every activity in it, archived ones included. */
  activities: CategoryActivity[];
}

export interface ActivityCategoryListItem extends ActivityCategory {
  /** Active activities only. */
  activitiesCount: number;
}

export type ActivityCategoryListResponse =
  PaginatedResponse<ActivityCategoryListItem>;
