"use client";

import { buildQueryString, createClient } from "../core";
import {
  AssignableActivitiesQuery,
  ProjectActivityListResponse,
} from "@/types/ProjectActivities";

const client = createClient({
  endpoint: "projects",
});

export const ProjectActivitiesClientApi = {
  getAssignable: (params?: AssignableActivitiesQuery) =>
    client.get<ProjectActivityListResponse>(
      `/me/activities${buildQueryString(params)}`,
    ),
};
