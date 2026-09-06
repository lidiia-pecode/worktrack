"use client";

import { createClient } from "../core";
import { ProjectActivityListResponse } from "@/types/ProjectActivities";

const client = createClient({
  endpoint: "projects",
});

export const ProjectActivitiesClientApi = {
  getAll: (projectId: string) =>
    client.get<ProjectActivityListResponse>(`/${projectId}/activities`),
};
