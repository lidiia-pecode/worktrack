"use client";

import { ProjectsClientApi } from "@/app/api/projects/projects.client";
import { Project, ProjectPayload, UpdateProjectPayload } from "@/types";

import { createEntityQuery } from "./shared/createEntityQuery";
import { createEntityMutations } from "./shared/createEntityMutations";
import { queryKeys } from "./shared/queryKeys";

const useProjectsQuery = createEntityQuery<Project>({
  queryKey: queryKeys.projects,

  api: {
    getAll: ProjectsClientApi.getAll,
  },
});

const useProjectsMutations = createEntityMutations<
  Project,
  ProjectPayload,
  UpdateProjectPayload,
  Project,
  Project
>({
  queryKey: queryKeys.projects.all,

  api: {
    create: ProjectsClientApi.create,
    update: ProjectsClientApi.update,
    delete: ProjectsClientApi.archive,
    restore: ProjectsClientApi.unarchive,
  },

  messages: {
    create: "Project created successfully",
    update: "Project updated successfully",
    delete: "Project archived successfully",
    restore: "Project restored successfully",
  },
});

export function useProjects(page = 1) {
  const query = useProjectsQuery(page);
  const actions = useProjectsMutations();

  return {
    ...query,
    actions,
  };
}
