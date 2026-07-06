import { PaginatedResponse } from ".";
import { ActivityCategory } from "./ActivityCategory";

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityPayload {
  name: string;
  categoryId: string;
}

export type UpdateActivityPayload = Partial<ActivityPayload>;
export type ActivityListResponse = PaginatedResponse<Activity>;
