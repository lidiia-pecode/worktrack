"use client";

import {
  AddTeamMemberPayload,
  ChangeTeamManagerPayload,
  CreateTeamPayload,
  Team,
  TeamArchiveImpact,
  TeamListResponse,
  TeamMembership,
  TeamsQuery,
  UpdateTeamPayload,
} from "@/types/Team";

import { buildQueryString, createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  Team,
  CreateTeamPayload,
  UpdateTeamPayload,
  TeamListResponse,
  Omit<TeamsQuery, "page">
>({
  endpoint: "teams",
});

const client = createClient({
  endpoint: "teams",
});

export const TeamsClientApi = {
  ...crud,

  addMember: (teamId: string, data: AddTeamMemberPayload) =>
    client.post<TeamMembership>(`/${teamId}/members`, data),

  changeManager: (teamId: string, data: ChangeTeamManagerPayload) =>
    client.patch<TeamMembership>(`/${teamId}/manager`, data),

  /** `date` is the first day off the team, today unless given. */
  removeMember: (teamId: string, membershipId: string, date?: string) =>
    client.delete<void>(
      `/${teamId}/members/${membershipId}${buildQueryString({ date })}`,
    ),

  getArchiveImpact: (id: string) =>
    client.get<TeamArchiveImpact>(`/${id}/archive-impact`),

  archive: (id: string) => client.archive<Team>(`/${id}/archive`),

  unarchive: (id: string) => client.patch<Team>(`/${id}/unarchive`),
};
