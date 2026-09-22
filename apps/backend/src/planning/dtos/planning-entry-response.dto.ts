import { Expose, Type } from 'class-transformer';
import { ProjectResponse } from 'src/projects/dtos/project-response.dto';

export class PlanningEntryResponse {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  createdById?: string;

  @Expose()
  @Type(() => ProjectResponse)
  project!: ProjectResponse;

  @Expose()
  plannedMinutes!: number;

  @Expose()
  note?: string;

  @Expose()
  date!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
