"use client";

import { createClient } from "../core";

import {
  ProjectActivityListResponse,
  ProjectActivityPayload,
} from "@/types/ProjectActivities";

const client = createClient({
  endpoint: "projects",
});

export const ProjectActivitiesClientApi = {
  getAll: (projectId: string) =>
    client.get<ProjectActivityListResponse>(`/${projectId}/activities`),

  addActivity: (projectId: string, data: ProjectActivityPayload) =>
    client.post(`/${projectId}/activities`, data),

  archiveActivity: (projectId: string, projectActivityId: string) =>
    client.delete(`/${projectId}/activities/${projectActivityId}`),
};
