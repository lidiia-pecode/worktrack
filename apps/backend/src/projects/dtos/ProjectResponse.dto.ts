import { Expose, Type } from 'class-transformer';
import { UserResponse } from 'src/users/dtos/UserResponse.dto';
import { ProjectStatus } from '../enums/ProjectStatus.enum';
import { ProjectActivityResponse } from './ProjectActivityResponse.dto';

export class ProjectResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description?: string;

  @Expose()
  status!: ProjectStatus;

  @Expose()
  @Type(() => UserResponse)
  users!: UserResponse[];

  @Expose()
  @Type(() => ProjectActivityResponse)
  projectActivities!: ProjectActivityResponse[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
