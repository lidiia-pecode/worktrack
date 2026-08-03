import { PaginatedResponse, PaginationParams } from ".";
import { Status } from "./enums";
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
  isBillable: boolean;
  date: string;
}

export type UpdateTimelogPayload = Partial<TimelogPayload>;

export interface TimelogsQuery extends PaginationParams {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: Status;
}

export type TimelogListResponse = PaginatedResponse<Timelog>;
