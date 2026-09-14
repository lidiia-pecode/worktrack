// src/companies/dtos/company-response.dto.ts
import { Expose } from 'class-transformer';
import { CompanyStatus } from '../enums/company-status.enum';
import { WeekDay } from '../enums/week-day.enum';

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

  @Expose()
  standardWorkHoursPerDay!: number;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
