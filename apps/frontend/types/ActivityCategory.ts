import { Activity, PaginatedResponse, SearchablePaginationParams } from ".";
import { Company } from "./Company";
import { ActCategoryStatus, ActiveActivitiesAction } from "./enums";

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

export interface ActivityCategoryArchiveImpact {
  activities: {
    id: string;
    name: string;
    projects: { id: string; name: string }[];
  }[];
}

export type UpdateActivityCategoryPayload = Partial<ActivityCategoryPayload>;
export interface ActivityCategoryListItem extends ActivityCategory {
  /** Active activities only. */
  activitiesCount: number;
}

export type ActivityCategoryListResponse =
  PaginatedResponse<ActivityCategoryListItem>;
