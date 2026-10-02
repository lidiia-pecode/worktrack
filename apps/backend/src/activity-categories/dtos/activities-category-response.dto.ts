import { Exclude, Expose, Type } from 'class-transformer';
import { ArchiveImpactProjectResponse } from 'src/activities/dtos/archive-impact-project-response.dto';
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
