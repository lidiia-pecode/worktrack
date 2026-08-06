// src/companies/dtos/company-response.dto.ts
import { Expose } from 'class-transformer';
import { CompanyStatus, WeekDay } from '../entities/company.entity';

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
