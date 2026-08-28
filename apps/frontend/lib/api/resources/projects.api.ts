"use client";

import {
  Project,
  ProjectListResponse,
  ProjectPayload,
  ProjectsQuery,
  UpdateProjectPayload,
} from "@/types";

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
};
