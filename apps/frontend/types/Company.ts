import { CompanyCurrency, CompanyStatus, WeekDay } from "./enums";

export interface Company {
  id: string;
  companyName: string;
  slug: string;
  status: CompanyStatus;
  timezone: string;
  currency: CompanyCurrency;
  weekStartDay: WeekDay;
  /** The standard day in force today. */
  standardWorkHoursPerDay: number;
  /** The change to it that starts after today, if one is scheduled. */
  standardDayChange: StandardDayChange | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface StandardDayChange {
  validFrom: string;
  hoursPerDay: number;
}

export interface UpdateCompanyPayload {
  companyName?: string;
  timezone?: string;
  currency?: CompanyCurrency;
  weekStartDay?: WeekDay;
  /** From the company's start, as the setup guide sets it. */
  standardWorkHoursPerDay?: number;
}
