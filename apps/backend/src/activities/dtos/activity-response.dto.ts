import { Exclude, Expose, Type } from 'class-transformer';
import { ActivityCategoryResponse } from 'src/activity-categories/dtos/activities-category-response.dto';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
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

@Exclude()
export class ActivityProjectResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: ProjectStatus;
}

@Exclude()
export class ActivityDetailsResponse extends ActivityResponse {
  /** Projects of every status that offer it; absent for an employee. */
  @Expose()
  @Type(() => ActivityProjectResponse)
  projects?: ActivityProjectResponse[];
}

@Exclude()
export class ActivityListItemResponse extends ActivityResponse {
  /** Active projects offering it; absent for an employee. */
  @Expose()
  projectsCount?: number;
}

export class ActivityArchiveImpactResponse {
  @Expose()
  @Type(() => ArchiveImpactProjectResponse)
  projects!: ArchiveImpactProjectResponse[];
}
