"use client";

import { createClient } from "../core";
import { PaginationParams } from "@/types";
import { ProjectActivityListResponse } from "@/types/ProjectActivities";

const client = createClient({
  endpoint: "projects",
});

const buildQuery = (params?: PaginationParams): string => {
  const search = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  });

  const queryString = search.toString();

  return queryString ? `?${queryString}` : "";
};

export const ProjectActivitiesClientApi = {
  getMine: (params?: PaginationParams) =>
    client.get<ProjectActivityListResponse>(
      `/me/activities${buildQuery(params)}`,
    ),
};
