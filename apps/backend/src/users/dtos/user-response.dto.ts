import { Exclude, Expose, Type } from 'class-transformer';
import { UserRole, UserStatus } from '../enums/user-role.enum';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { TeamRole } from 'src/teams/enums/team-role.enum';

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
  googleLinked!: boolean;

  @Expose()
  hasPassword!: boolean;

  /** While deactivated, their last working day. */
  @Expose()
  lastWorkingDay!: string | null;

  @Expose()
  updatedAt!: Date;

  @Expose()
  createdAt!: Date;
}

/** The person's one team now, among those the caller can see, and their role in it. */
@Exclude()
export class UserTeamResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  roleInTeam!: TeamRole;

  @Expose()
  joinedAt!: string;
}

@Exclude()
export class UserListItemResponse extends UserResponse {
  @Expose()
  @Type(() => UserTeamResponse)
  team!: UserTeamResponse | null;

  /** Active projects only. */
  @Expose()
  projectsCount!: number;

  /** Today's capacity; owner only. */
  @Expose()
  weeklyMinutes?: number;
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

  @Expose()
  @Type(() => UserTeamResponse)
  team!: UserTeamResponse | null;
}
