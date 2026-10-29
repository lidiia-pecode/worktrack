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
class CategoryActivityRefResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;
}

@Exclude()
export class ActivityCategoryListItemResponse extends ActivityCategoryResponse {
  /** Active activities only. */
  @Expose()
  activitiesCount!: number;

  /** The first few active activities, by name. */
  @Expose()
  @Type(() => CategoryActivityRefResponse)
  firstActivities!: CategoryActivityRefResponse[];

  /** Active activities that an active project offers; not sent to an employee. */
  @Expose()
  onProjectsCount?: number;
}

@Exclude()
export class CategoryActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: ActivityStatus;

  /** Active projects that offer it now; not sent to an employee. */
  @Expose()
  projectsCount?: number;
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
}

export class ActivityCategoryArchiveImpactResponse {
  @Expose()
  @Type(() => ArchiveImpactActivityResponse)
  activities!: ArchiveImpactActivityResponse[];
}
