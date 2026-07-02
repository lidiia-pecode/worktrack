"use client";

import {
  ProjectPayload,
  ProjectResponse,
  UpdateProjectPayload,
} from "../../../types";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";

export const ProjectsClientApi = {
  getAll: (page = 1) =>
    apiClient<ProjectResponse>(() =>
      fetch(`${BASE_API_URL}/projects?page=${page}`, {
        credentials: "include",
      }),
    ),

  create: (data: ProjectPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  update: (id: string, data: UpdateProjectPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  delete: (id: string) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),
};
