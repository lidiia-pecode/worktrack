import { Exclude, Expose, Type } from 'class-transformer';
import { ActivityCategoryResponse } from 'src/activity-categories/dtos/ActivitiesCategoryResponse.dto';
import { ActivityStatus } from '../enums/activity-status.enum';

@Exclude()
export class ActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  companyId!: string;

  @Expose()
  name!: string;

  @Expose()
  isAbsence!: boolean;

  @Expose()
  defaultBillable!: boolean;

  @Expose()
  @Type(() => ActivityCategoryResponse)
  category!: ActivityCategoryResponse;

  @Expose()
  status!: ActivityStatus;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
