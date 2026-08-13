import { PaginatedResponse, PaginationParams, User } from ".";
import { Company } from "./Company";
import { ProjectActivity } from "./ProjectActivities";

export interface TimeLog {
  id: string;
  companyId: string;
  userId: string;
  projectActivityId: string;
  isBillable: boolean;
  minutes: number;
  note?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  user?: User;
  projectActivity?: ProjectActivity;
}

export interface TimeLogPayload {
  projectActivityId: string;
  minutes: number;
  note?: string;
  isBillable?: boolean;
  date: string;
}

export type UpdateTimeLogPayload = Partial<TimeLogPayload>;

export interface TimelogsQuery extends PaginationParams {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  projectId?: string;
}

export type TimeLogListResponse = PaginatedResponse<TimeLog>;
