import { Exclude, Expose, Type } from 'class-transformer';
import { ArchiveImpactProjectResponse } from 'src/activities/dtos/archive-impact-project-response.dto';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import { ActCategoryStatus } from '../enums/category-status.enum';

@Exclude()
export class ActivityCategoryResponse {
  @Expose()
  id!: string;

  @Expose()
  companyId!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: ActCategoryStatus;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

@Exclude()
export class ActivityCategoryListItemResponse extends ActivityCategoryResponse {
  /** Active activities only. */
  @Expose()
  activitiesCount!: number;
}

@Exclude()
export class CategoryActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: ActivityStatus;

  /** On a project, archived ones too, so it cannot be left without a category. */
  @Expose()
  isInUse!: boolean;
}

@Exclude()
export class ActivityCategoryDetailsResponse extends ActivityCategoryResponse {
  /** Every activity in it, archived ones included. */
  @Expose()
  @Type(() => CategoryActivityResponse)
  activities!: CategoryActivityResponse[];
}

class ArchiveImpactActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  @Type(() => ArchiveImpactProjectResponse)
  projects!: ArchiveImpactProjectResponse[];

  @Expose()
  isInUse!: boolean;
}

export class ActivityCategoryArchiveImpactResponse {
  @Expose()
  @Type(() => ArchiveImpactActivityResponse)
  activities!: ArchiveImpactActivityResponse[];
}
