"use client";

import {
  CreateTeamPayload,
  Team,
  TeamListResponse,
  UpdateTeamPayload,
} from "@/types/Team";
import { createCrudClient, createClient } from "../core";

const crud = createCrudClient<
  Team,
  CreateTeamPayload,
  UpdateTeamPayload,
  TeamListResponse
>({ endpoint: "teams" });

const client = createClient({ endpoint: "teams" });

export const TeamsClientApi = {
  ...crud,
  archive: (id: string) => client.archive<Team>(`/${id}/archive`),
  unarchive: (id: string) => client.patch<Team>(`/${id}/unarchive`),
};
