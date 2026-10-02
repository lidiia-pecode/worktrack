import { Exclude, Expose, Type } from 'class-transformer';
import { ActivityCategoryResponse } from 'src/activity-categories/dtos/activities-category-response.dto';
import { ActivityStatus } from '../enums/activity-status.enum';
import { ArchiveImpactProjectResponse } from './archive-impact-project-response.dto';

@Exclude()
export class ActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  companyId!: string;

  @Expose()
  name!: string;

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

export class ActivityArchiveImpactResponse {
  @Expose()
  @Type(() => ArchiveImpactProjectResponse)
  projects!: ArchiveImpactProjectResponse[];
}
