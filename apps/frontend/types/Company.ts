import { CompanyStatus, WeekDay } from "./enums";

export interface Company {
  id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  timezone: string;
  currency: string;
  weekStartDay: WeekDay;
  standardWorkHoursPerDay: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface UpdateCompanyPayload {
  name?: string;
  timezone?: string;
  currency?: string;
  weekStartDay?: WeekDay;
  standardWorkHoursPerDay?: number;
}
