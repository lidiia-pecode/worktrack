"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Project,
  ProjectPayload,
  ProjectsQuery,
  UpdateProjectPayload,
} from "@/types";

import { ProjectsClientApi } from "@/lib/api/resources";

import { createEntityMutations } from "./shared/createEntityMutations";
import { createEntityQuery } from "./shared/createEntityQuery";
import { queryKeys } from "./shared/queryKeys";

type ProjectQueryParams = Omit<ProjectsQuery, "page">;

const projectsQueries = createEntityQuery<Project, ProjectQueryParams>({
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

  // Removing somebody from a project deletes their future plans for it.
  alsoInvalidate: [queryKeys.planning.all],

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

export const useProjectDetails = (id?: string) =>
  useQuery({
    queryKey: queryKeys.projects.detail(id ?? ""),
    queryFn: () => ProjectsClientApi.getById(id!),
    enabled: Boolean(id),
  });

export function useProjects(page = 1, params?: ProjectQueryParams) {
  const query = useProjectsQuery(page, params);

  const actions = useProjectsMutations();

  return {
    ...query,
    actions,
  };
}
