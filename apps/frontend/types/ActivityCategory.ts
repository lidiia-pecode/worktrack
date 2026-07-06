import { PaginatedResponse } from ".";

export interface ActivityCategory {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityCategoryPayload {
  name: string;
}

export type UpdateActivityCategoryPayload = Partial<ActivityCategoryPayload>;
export type ActivityCategoryListResponse = PaginatedResponse<ActivityCategory>;
