import { Exclude, Expose, Type } from 'class-transformer';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';

/** What a plan needs of its project: which one, its name, whether archived. */
@Exclude()
export class PlanningProjectResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: ProjectStatus;
}

export class PlanningEntryResponse {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  createdById?: string;

  @Expose()
  @Type(() => PlanningProjectResponse)
  project!: PlanningProjectResponse;

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
