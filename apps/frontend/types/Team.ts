import { PaginatedResponse, PaginationParams } from ".";
import { Company } from "./Company";
import { TeamRole, TeamStatus } from "./enums";

// TeamUserResponse
export interface TeamUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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

// Payloads
export interface CreateTeamPayload {
  name: string;
}

export type UpdateTeamPayload = Partial<CreateTeamPayload>;

export interface TeamsQuery extends PaginationParams {
  status?: TeamStatus;
}

export interface AddTeamMemberPayload {
  userId: string;
  roleInTeam?: TeamRole;
  joinedAt: string;
  leftAt?: string | null;
}

export interface UpdateTeamMemberPayload {
  roleInTeam?: TeamRole;
  joinedAt?: string;
  leftAt?: string | null;
}

export type TeamListResponse = PaginatedResponse<Team>;
