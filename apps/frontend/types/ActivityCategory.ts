import { PaginatedResponse } from ".";
import { Status } from "./enums";

export interface ActivityCategory {
  id: string;
  name: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityCategoryPayload {
  name: string;
}

export type UpdateActivityCategoryPayload = Partial<ActivityCategoryPayload>;
export type ActivityCategoryListResponse = PaginatedResponse<ActivityCategory>;
