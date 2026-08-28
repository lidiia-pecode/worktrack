"use client";

import {
  AddTeamMemberPayload,
  CreateTeamPayload,
  Team,
  TeamListResponse,
  TeamMembership,
  TeamsQuery,
  UpdateTeamMemberPayload,
  UpdateTeamPayload,
} from "@/types/Team";

import { createClient, createCrudClient } from "../core";

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

  updateMember: (
    teamId: string,
    membershipId: string,
    data: UpdateTeamMemberPayload,
  ) => client.patch<TeamMembership>(`/${teamId}/members/${membershipId}`, data),

  removeMember: (teamId: string, membershipId: string) =>
    client.delete<void>(`/${teamId}/members/${membershipId}`),

  archive: (id: string) => client.archive<Team>(`/${id}/archive`),

  unarchive: (id: string) => client.patch<Team>(`/${id}/unarchive`),
};
