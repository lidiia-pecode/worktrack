import { ReportingPeriodStatus } from "./enums";
import { Company } from "./Company";

export interface ReportingPeriod {
  id: string;
  companyId: string;
  name: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  status: ReportingPeriodStatus;
  createdAt: string;
  updatedAt: string;
  company?: Company;
}

//(back CreateReportingPeriodDto)
export interface CreateReportingPeriodPayload {
  name: string;
  startDate: string;
  endDate: string;
  status?: ReportingPeriodStatus;
}

//  (back UpdateReportingPeriodDto)
export type UpdateReportingPeriodPayload =
  Partial<CreateReportingPeriodPayload>;

// Query (back GetReportQueryDto)
export interface ReportQuery {
  startDate: string;
  endDate: string;
  userId?: string;
  projectId?: string;
}
