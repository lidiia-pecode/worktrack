import { Expose, Type } from 'class-transformer';
import { UserResponse } from 'src/users/dtos/UserResponse.dto';
import { ProjectStatus } from '../enums/ProjectStatus.enum';

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
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
