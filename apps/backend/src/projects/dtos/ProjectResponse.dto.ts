import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserResponse } from 'src/users/dtos/UserResponse.dto';
import { Status } from '../../enums/Status.enum';
import { ProjectActivityResponse } from './ProjectActivityResponse.dto';

export class ProjectResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description?: string;

  @Expose()
  status!: Status;

  @Expose()
  @Type(() => UserResponse)
  users!: UserResponse[];

  @ApiProperty({ type: () => [ProjectActivityResponse] })
  @Expose()
  @Type(() => ProjectActivityResponse)
  projectActivities!: ProjectActivityResponse[];

  @Expose()
  @Type(() => UserResponse)
  owner!: UserResponse;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
