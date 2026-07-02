import { Expose } from 'class-transformer';
import { ActivityResponse } from 'src/activities/dtos/ActivityResponse.dto';

export class ProjectActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  activity!: ActivityResponse;

  @Expose()
  isActive!: boolean;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
