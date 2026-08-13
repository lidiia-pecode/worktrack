import {
  ActivityCategoryResponse,
  PaginatedResponse,
  PaginationParams,
} from ".";
import { ActivityStatus } from "./enums";

export interface Activity {
  id: string;
  companyId: string;
  name: string;
  isAbsence: boolean;
  defaultBillable: boolean;
  status: ActivityStatus;
  category: ActivityCategoryResponse;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityPayload {
  name: string;
  categoryId: string;
  isAbsence?: boolean;
  defaultBillable?: boolean;
}

export interface ActivityQuery extends PaginationParams {
  status?: ActivityStatus;
}

export type UpdateActivityPayload = Partial<ActivityPayload>;
export type ActivityListResponse = PaginatedResponse<Activity>;
