import { Expose, Type } from 'class-transformer';
import { ActivityCategoryResponse } from 'src/activity-categories/dtos/ActivitiesCategoryResponse.dto';

export class ActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  @Type(() => ActivityCategoryResponse)
  category!: ActivityCategoryResponse;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
