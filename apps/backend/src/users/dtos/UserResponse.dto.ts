import { Exclude, Expose, Type } from 'class-transformer';
import { UserRole, UserStatus } from '../enums/UserRole.enum';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';

@Exclude()
export class UserResponse {
  @Expose()
  id!: string;

  @Expose()
  companyId!: string;

  @Expose()
  status!: UserStatus;

  @Expose()
  role!: UserRole;

  @Expose()
  position?: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  username?: string;

  @Expose()
  capacityHoursPerWeek!: number;

  @Expose()
  googleLinked!: boolean;

  @Expose()
  hasPassword!: boolean;

  @Expose()
  updatedAt!: Date;

  @Expose()
  createdAt!: Date;
}

@Exclude()
export class UserProjectResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: ProjectStatus;
}

@Exclude()
export class UserDetailsResponse extends UserResponse {
  @Expose()
  @Type(() => UserProjectResponse)
  projects!: UserProjectResponse[];
}
