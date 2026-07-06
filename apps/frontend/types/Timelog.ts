import { PaginationParams } from ".";
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

export interface TimeLogPayload {
  projectActivityId: string;
  time: number;
  note?: string;
  date: string;
}

export type UpdateTimeLogPayload = Partial<TimeLogPayload>;

export interface GetTimeLogsQuery extends PaginationParams {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}
