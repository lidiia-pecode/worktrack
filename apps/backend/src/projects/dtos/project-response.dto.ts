import { OmitType } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { ProjectActivityResponse } from './project-activity-response.dto';
import { AssignableUserResponse } from 'src/users/dtos/assignable-user-response.dto';
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

  /**
   * Scoped to the caller, so it can be shorter than the project — read its
   * size from `membersCount`, never from this array's length.
   */
  @Expose()
  @Type(() => AssignableUserResponse)
  users!: AssignableUserResponse[];

  /** The project's true size, the same for every role. */
  @Expose()
  membersCount!: number;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

// Project lists must not carry the member roster, only its size.
export class ProjectListItemResponse extends OmitType(ProjectResponse, [
  'users',
] as const) {}
