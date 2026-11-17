import { Exclude, Expose, Type } from 'class-transformer';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';

/** Only what the screens read of a plan's project, to keep a month small. */
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
  date!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
