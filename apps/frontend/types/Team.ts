import { PaginatedResponse, SearchablePaginationParams } from ".";
import { Company } from "./Company";
import { TeamRole, TeamStatus, UserRole, UserStatus } from "./enums";

// TeamUserResponse
export interface TeamUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
  position?: string | null;
}

// TeamMembershipResponse
export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  roleInTeam: TeamRole;
  joinedAt: string;
  leftAt?: string | null;
  user?: TeamUser;
}

// TeamResponse
export interface Team {
  id: string;
  companyId: string;
  name: string;
  status: TeamStatus;
  memberships?: TeamMembership[];
  createdAt: string;
  updatedAt: string;
  company: Company;
}

// TeamArchiveImpactResponse: what still has to leave before it can be archived
export interface TeamArchiveImpact {
  openMemberships: (TeamMembership & { user: TeamUser })[];
  pendingInvitationCount: number;
}

// Payloads
export interface CreateTeamPayload {
  name: string;
}

export type UpdateTeamPayload = Partial<CreateTeamPayload>;

export interface TeamsQuery extends SearchablePaginationParams {
  status?: TeamStatus;
}

/** Adds a member; a team's manager is appointed separately. */
export interface AddTeamMemberPayload {
  userId: string;
  /** Someone in another team leaves it the day they join this one. */
  leaveCurrentTeam?: boolean;
  /** The first day on the team: today unless given, and never after it. */
  date?: string;
}

export interface UpdateTeamMemberPayload {
  roleInTeam?: TeamRole;
  /** Made a member here, they leave the team they are a member of today. */
  leaveCurrentTeam?: boolean;
}

export type TeamListResponse = PaginatedResponse<Team>;
