"use client";

import { useMemo } from "react";
import {
  hashKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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

export const useAllProjectsQuery = projectsQueries.useAllPagesQuery;

/** The client names already used on projects, archived ones included. */
export function useClientNameSuggestions() {
  const { items } = useAllProjectsQuery();

  return useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((project) => project.clientName)
            .filter((clientName): clientName is string => Boolean(clientName)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [items],
  );
}

export const useProjectsInfiniteQuery = projectsQueries.useInfiniteQuery;

export const useProjectsMutations = createEntityMutations<
  Project,
  ProjectPayload,
  UpdateProjectPayload,
  Project,
  Project
>({
  queryKey: queryKeys.projects.all,

  // Removing somebody from a project deletes their future plans for it, and a
  // person's and an activity's details list the projects they are on.
  alsoInvalidate: [
    queryKeys.planning.all,
    queryKeys.users.all,
    queryKeys.activities.all,
  ],

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
  conflictShownInForm: true,
});

export const useProjectDetails = (id?: string) =>
  useQuery({
    queryKey: queryKeys.projects.detail(id ?? ""),
    queryFn: () => ProjectsClientApi.getById(id!),
    enabled: Boolean(id),
  });

export const useOwnProjects = () =>
  useQuery({
    queryKey: queryKeys.projects.mine(),
    queryFn: ProjectsClientApi.getMine,
  });

interface MemberLink {
  projectId: string;
  userId: string;
}

interface ActivityLink {
  projectId: string;
  activityId: string;
}

/**
 * Adds or removes one person or activity on a project. The response is the
 * project's new details; what follows from them, such as a person's projects
 * or the plans of someone removed, goes stale.
 */
export const useProjectLinks = () => {
  const queryClient = useQueryClient();

  const onSuccess = (project: Project) => {
    const detailKey = queryKeys.projects.detail(project.id);
    const detailHash = hashKey(detailKey);
    queryClient.setQueryData(detailKey, project);

    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.all,
      predicate: (query) => query.queryHash !== detailHash,
    });
    [
      queryKeys.users.all,
      queryKeys.activities.all,
      queryKeys.projectActivities.all,
      queryKeys.planning.all,
    ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  };

  const addMember = useMutation({
    mutationFn: ({ projectId, userId }: MemberLink) =>
      ProjectsClientApi.addMember(projectId, userId),
    onSuccess,
  });
  const removeMember = useMutation({
    mutationFn: ({ projectId, userId }: MemberLink) =>
      ProjectsClientApi.removeMember(projectId, userId),
    onSuccess,
  });
  const addActivity = useMutation({
    mutationFn: ({ projectId, activityId }: ActivityLink) =>
      ProjectsClientApi.addActivity(projectId, activityId),
    onSuccess,
  });
  const removeActivity = useMutation({
    mutationFn: ({ projectId, activityId }: ActivityLink) =>
      ProjectsClientApi.removeActivity(projectId, activityId),
    onSuccess,
  });

  return {
    addMember,
    removeMember,
    addActivity,
    removeActivity,
    isSaving: [addMember, removeMember, addActivity, removeActivity].some(
      (mutation) => mutation.isPending,
    ),
  };
};
