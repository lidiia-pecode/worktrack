"use client";

import {
  ProjectActivityListResponse,
  ProjectActivityPayload,
  ProjectListResponse,
  ProjectPayload,
  UpdateProjectPayload,
} from "../../../types";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";

export const ProjectsClientApi = {
  getAll: (page = 1) =>
    apiClient<ProjectListResponse>(() =>
      fetch(`${BASE_API_URL}/projects?page=${page}`, {
        credentials: "include",
      }),
    ),

  getById: (id: string) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects/${id}`, {
        credentials: "include",
      }),
    ),

  create: (data: ProjectPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  update: (id: string, data: UpdateProjectPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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

  assignUser: (projectId: string, userId: string) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects/${projectId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ userId }),
      }),
    ),

  unassignUser: (projectId: string, userId: string) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects/${projectId}/unassign/${userId}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),

  getActivities: (projectId: string) =>
    apiClient<ProjectActivityListResponse>(() =>
      fetch(`${BASE_API_URL}/projects/${projectId}/activities`, {
        credentials: "include",
      }),
    ),

  addActivity: (projectId: string, data: ProjectActivityPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/projects/${projectId}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
