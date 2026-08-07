import { Expose, Type } from 'class-transformer';
import { ActivityResponse } from 'src/activities/dtos/ActivityResponse.dto';
import { ProjectStatus } from '../enums/project-status.enum';

class ProjectSummaryResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: ProjectStatus;
}

export class ProjectActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  @Type(() => ProjectSummaryResponse)
  project!: ProjectSummaryResponse;

  @Expose()
  @Type(() => ActivityResponse)
  activity!: ActivityResponse;

  @Expose()
  isActive!: boolean;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
