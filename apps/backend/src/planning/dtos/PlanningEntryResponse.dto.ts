import { Expose, Type } from 'class-transformer';
import { ProjectActivityResponse } from 'src/projects/dtos/ProjectActivityResponse.dto';

export class PlanningEntryResponse {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  createdById?: string;

  @Expose()
  @Type(() => ProjectActivityResponse)
  projectActivity!: ProjectActivityResponse;

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
