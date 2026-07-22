import { PaginatedResponse } from ".";
import { ActivityCategory } from "./ActivityCategory";
import { Status } from "./enums";

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityPayload {
  name: string;
  categoryId: string;
}

export type UpdateActivityPayload = Partial<ActivityPayload>;
export type ActivityListResponse = PaginatedResponse<Activity>;
