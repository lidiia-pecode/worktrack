import { Expose, Type } from 'class-transformer';
import { ProjectActivityResponse } from 'src/projects/dtos/project-activity-response.dto';
import { UserNameResponse } from 'src/users/dtos/user-name-response.dto';

export class TimeLogResponse {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  @Type(() => ProjectActivityResponse)
  projectActivity!: ProjectActivityResponse;

  @Expose()
  isBillable!: boolean;

  @Expose()
  minutes!: number;

  @Expose()
  note?: string;

  @Expose()
  date!: string;

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
