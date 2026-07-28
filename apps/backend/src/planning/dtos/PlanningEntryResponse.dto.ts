import { Expose } from 'class-transformer';

export class PlanningEntryResponse {
  @Expose()
  id!: string;

  @Expose()
  employeeId!: string;

  @Expose()
  createdById?: string;

  @Expose()
  projectId!: string;

  @Expose()
  time!: number;

  @Expose()
  note?: string;

  @Expose()
  date!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
