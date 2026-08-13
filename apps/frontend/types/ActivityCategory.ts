import { Activity, PaginatedResponse, PaginationParams } from ".";
import { Company } from "./Company";
import { ActCategoryStatus } from "./enums";

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

export interface ActivityCategoryQuery extends PaginationParams {
  status?: ActCategoryStatus;
}

export type UpdateActivityCategoryPayload = Partial<ActivityCategoryPayload>;
export type ActivityCategoryListResponse = PaginatedResponse<ActivityCategory>;
