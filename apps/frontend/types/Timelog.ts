import { PaginatedResponse, PaginationParams } from ".";
import { ProjectActivity } from "./ProjectActivities";

export interface Timelog {
  id: string;
  userId: string;
  projectActivity: ProjectActivity;
  isBillable: boolean;
  time: number;
  note?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelogPayload {
  projectActivityId: string;
  time: number;
  note?: string;
  date: string;
}

export type UpdateTimelogPayload = Partial<TimelogPayload>;

export interface GetTimelogsQuery extends PaginationParams {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type TimelogListResponse = PaginatedResponse<Timelog>;
