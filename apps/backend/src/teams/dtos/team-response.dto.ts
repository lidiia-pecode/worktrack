import { Exclude, Expose, Type } from 'class-transformer';
import { TeamStatus } from '../entities/team.entity';
import { TeamRole } from '../entities/team-membership.entity';

@Exclude()
export class TeamUserResponse {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  position?: string;
}

@Exclude()
export class TeamMembershipResponse {
  @Expose()
  id!: string;

  @Expose()
  teamId!: string;

  @Expose()
  userId!: string;

  @Expose()
  roleInTeam!: TeamRole;

  @Expose()
  joinedAt!: string;

  @Expose()
  leftAt!: string | null;

  @Expose()
  @Type(() => TeamUserResponse)
  user?: TeamUserResponse;
}

@Exclude()
export class TeamResponse {
  @Expose()
  id!: string;

  @Expose()
  companyId!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: TeamStatus;

  @Expose()
  @Type(() => TeamMembershipResponse)
  memberships?: TeamMembershipResponse[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
