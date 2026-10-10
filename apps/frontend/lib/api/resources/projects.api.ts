"use client";

import {
  PaginatedResponse,
  Project,
  ProjectListResponse,
  ProjectPayload,
  ProjectsQuery,
  UpdateProjectPayload,
} from "@/types";
import { ProjectSummary } from "@/types/ProjectActivities";

import { createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  Project,
  ProjectPayload,
  UpdateProjectPayload,
  ProjectListResponse,
  Omit<ProjectsQuery, "page">
>({
  endpoint: "projects",
});

const client = createClient({
  endpoint: "projects",
});

export const ProjectsClientApi = {
  ...crud,

  archive: (id: string) => client.archive<Project>(`/${id}/archive`),

  unarchive: (id: string) => client.patch<Project>(`/${id}/unarchive`),

  addMember: (id: string, userId: string) =>
    client.post<Project>(`/${id}/members/${userId}`),

  removeMember: (id: string, userId: string) =>
    client.delete<Project>(`/${id}/members/${userId}`),

  addActivity: (id: string, activityId: string) =>
    client.post<Project>(`/${id}/activities/${activityId}`),

  removeActivity: (id: string, activityId: string) =>
    client.delete<Project>(`/${id}/activities/${activityId}`),

  /** The caller's own active projects, with or without activities. */
  getMine: () => client.get<PaginatedResponse<ProjectSummary>>("/me"),
};
