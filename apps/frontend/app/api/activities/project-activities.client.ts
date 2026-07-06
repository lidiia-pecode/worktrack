"use client";

import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";
import {
  ProjectActivityListResponse,
  ProjectActivityPayload,
} from "@/types/ProjectActivities";

export const ProjectActivitiesClientApi = {
  getAll: (projectId: string) =>
    apiClient<ProjectActivityListResponse>(() =>
      fetch(`${BASE_API_URL}/projects/${projectId}/activities`, {
        credentials: "include",
      }),
    ),

  addActivity: (projectId: string, data: ProjectActivityPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects/${projectId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  archiveActivity: (projectId: string, projectActivityId: string) =>
    apiClient(() =>
      fetch(
        `${BASE_API_URL}/projects/${projectId}/activities/${projectActivityId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      ),
    ),
};
