// src/companies/dtos/company-response.dto.ts
import { Expose } from 'class-transformer';
import { CompanyStatus } from '../enum/company-status.enum';
import { WeekDay } from '../enum/week-day.enum';

export class CompanyResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

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
