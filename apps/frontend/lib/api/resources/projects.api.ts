"use client";

import {
  Project,
  ProjectListResponse,
  ProjectPayload,
  UpdateProjectPayload,
} from "@/types";

import { createCrudClient, createClient } from "../core";

const crud = createCrudClient<
  Project,
  ProjectPayload,
  UpdateProjectPayload,
  ProjectListResponse
>({ endpoint: "projects" });

const client = createClient({ endpoint: "projects" });

export const ProjectsClientApi = {
  ...crud,
  archive: (id: string) => client.archive<Project>(`/${id}/archive`),
  unarchive: (id: string) => client.patch<Project>(`/${id}/unarchive`),
};
