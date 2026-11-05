// src/companies/dtos/company-response.dto.ts
import { Expose, Type } from 'class-transformer';
import { CompanyStatus } from '../enums/company-status.enum';
import { WeekDay } from '../enums/week-day.enum';

export class StandardDayChangeResponse {
  @Expose()
  validFrom!: string;

  @Expose()
  hoursPerDay!: number;
}

export class CompanyResponseDto {
  @Expose()
  id!: string;

  @Expose()
  companyName!: string;

  @Expose()
  slug!: string;

  @Expose()
  status!: CompanyStatus;

  @Expose()
  timezone!: string;

  @Expose()
  currency!: string;

  @Expose()
  weekStartDay!: WeekDay;

  /** The standard day in force today. */
  @Expose()
  standardWorkHoursPerDay!: number;

  /** The change to it that starts after today, if one is scheduled. */
  @Expose()
  @Type(() => StandardDayChangeResponse)
  standardDayChange!: StandardDayChangeResponse | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
