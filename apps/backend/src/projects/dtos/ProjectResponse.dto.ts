import { Exclude, Expose, Type } from 'class-transformer';
import { ProjectActivityResponse } from './ProjectActivityResponse.dto';
import { ProjectStatus } from '../enums/project-status.enum';

@Exclude()
export class ProjectResponse {
  @Expose()
  id!: string;

  @Expose()
  companyId!: string;

  @Expose()
  name!: string;

  @Expose()
  clientName?: string | null;

  @Expose()
  description?: string | null;

  @Expose()
  status!: ProjectStatus;

  @Expose()
  @Type(() => ProjectActivityResponse)
  projectActivities!: ProjectActivityResponse[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
