"use client";

import {
  Activity,
  ActivityListResponse,
  ActivityPayload,
  UpdateActivityPayload,
} from "@/types";

import { createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  Activity,
  ActivityPayload,
  UpdateActivityPayload,
  ActivityListResponse
>({ endpoint: "activities" });

const client = createClient({ endpoint: "activities" });

export const ActivitiesClientApi = {
  ...crud,
  archive: (id: string) => client.archive<Activity>(`/${id}/archive`),
  unarchive: (id: string) => client.patch<Activity>(`/${id}/unarchive`),
};
