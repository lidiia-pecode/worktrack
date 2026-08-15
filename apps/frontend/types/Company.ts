import { CompanyCurrency, CompanyStatus, WeekDay } from "./enums";

export interface Company {
  id: string;
  companyName: string;
  slug: string;
  status: CompanyStatus;
  timezone: string;
  currency: CompanyCurrency;
  weekStartDay: WeekDay;
  standardWorkHoursPerDay: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface UpdateCompanyPayload {
  companyName?: string;
  timezone?: string;
  currency?: CompanyCurrency;
  weekStartDay?: WeekDay;
  standardWorkHoursPerDay?: number;
}
