import { Expose, Type } from 'class-transformer';

import { UserNameResponse } from 'src/users/dtos/user-name-response.dto';
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

  /** Who added it; null for records from before this was kept. On reads only. */
  @Expose()
  @Type(() => UserNameResponse)
  createdBy?: UserNameResponse | null;

  /** Who last changed it; null until it is changed. On reads only. */
  @Expose()
  @Type(() => UserNameResponse)
  updatedBy?: UserNameResponse | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
