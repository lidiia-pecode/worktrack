import { Expose, Type } from 'class-transformer';
import { ActivityCategoryResponse } from 'src/activity-categories/dtos/ActivitiesCategoryResponse.dto';
import { Status } from 'src/enums/Status.enum';

export class ActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  @Type(() => ActivityCategoryResponse)
  category!: ActivityCategoryResponse;

  @Expose()
  status!: Status;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
