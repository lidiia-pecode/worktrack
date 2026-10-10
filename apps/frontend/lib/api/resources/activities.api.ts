"use client";

import {
  Activity,
  ActivityArchiveImpact,
  ActivityDetails,
  ActivityListResponse,
  ActivityPayload,
  ActivityQuery,
  RestoreActivityPayload,
  UpdateActivityPayload,
} from "@/types";

import { createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  Activity,
  ActivityPayload,
  UpdateActivityPayload,
  ActivityListResponse,
  Omit<ActivityQuery, "page">,
  ActivityDetails
>({
  endpoint: "activities",
});

const client = createClient({
  endpoint: "activities",
});

export const ActivitiesClientApi = {
  ...crud,

  getArchiveImpact: (id: string) =>
    client.get<ActivityArchiveImpact>(`/${id}/archive-impact`),

  archive: (id: string) => client.archive<Activity>(`/${id}/archive`),

  unarchive: (id: string, payload?: RestoreActivityPayload) =>
    client.patch<Activity>(`/${id}/unarchive`, payload),
};
