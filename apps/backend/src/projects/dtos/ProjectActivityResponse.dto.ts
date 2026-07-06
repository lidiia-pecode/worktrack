import { Expose, Type } from 'class-transformer';
import { ActivityResponse } from 'src/activities/dtos/ActivityResponse.dto';
import { ProjectResponse } from './ProjectResponse.dto';

export class ProjectActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  @Type(() => ProjectResponse)
  project!: ProjectResponse;

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
