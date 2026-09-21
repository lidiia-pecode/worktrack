import { Expose } from 'class-transformer';
import { AbsenceType } from '../enums/absence-type.enum';

export class AbsenceResponse {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  type!: AbsenceType;

  @Expose()
  startDate!: string;

  @Expose()
  endDate!: string;

  @Expose()
  note?: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
