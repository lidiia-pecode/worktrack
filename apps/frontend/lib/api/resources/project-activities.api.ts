"use client";

import { buildQueryString, createClient } from "../core";
import { PaginationParams } from "@/types";
import { ProjectActivityListResponse } from "@/types/ProjectActivities";

const client = createClient({
  endpoint: "projects",
});

export const ProjectActivitiesClientApi = {
  getMine: (params?: PaginationParams) =>
    client.get<ProjectActivityListResponse>(
      `/me/activities${buildQueryString(params)}`,
    ),
};
