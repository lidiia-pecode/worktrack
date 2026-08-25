"use client";

import { Project, ProjectPayload, UpdateProjectPayload } from "@/types";
import { ProjectsClientApi } from "@/lib/api/resources";
import { createEntityQuery } from "./shared/createEntityQuery";
import { createEntityMutations } from "./shared/createEntityMutations";
import { queryKeys } from "./shared/queryKeys";

const projectsQueries = createEntityQuery<Project>({
  queryKey: queryKeys.projects,

  api: {
    getAll: ProjectsClientApi.getAll,
  },
});

export const useProjectsQuery = projectsQueries.useQuery;
export const useProjectsInfiniteQuery = projectsQueries.useInfiniteQuery;

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
    archive: ProjectsClientApi.archive,
    unarchive: ProjectsClientApi.unarchive,
  },

  messages: {
    create: "Project created successfully",
    update: "Project updated successfully",
    archive: "Project archived successfully",
    unarchive: "Project restored successfully",
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
