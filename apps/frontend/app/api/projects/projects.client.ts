"use client";

import {
  Project,
  ProjectListResponse,
  ProjectPayload,
  UpdateProjectPayload,
} from "@/types";

import { createCrudApi } from "../createCrudApi";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";

const crud = createCrudApi<
  Project,
  ProjectPayload,
  UpdateProjectPayload,
  ProjectListResponse
>({
  endpoint: "projects",
});

export const ProjectsClientApi = {
  ...crud,

  archive: (id: string) =>
    apiClient<Project>(() =>
      fetch(`${BASE_API_URL}/projects/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),

  unarchive: (id: string) =>
    apiClient<Project>(() =>
      fetch(`${BASE_API_URL}/projects/${id}/unarchive`, {
        method: "PATCH",
        credentials: "include",
      }),
    ),
};
