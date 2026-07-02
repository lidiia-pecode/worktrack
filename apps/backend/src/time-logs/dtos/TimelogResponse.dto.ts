import { Expose } from 'class-transformer';

export class TimeLogResponse {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  projectActivityId!: string;

  @Expose()
  isBillable!: boolean;

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
