"use client";

import { useMemo } from "react";

import { ProjectStatus } from "@/types/enums";
import { useProjectsQuery } from "@/hooks/useProjects";
import { useAuth } from "./auth/useAuth";

export type PickerProjectActivity = {
  id: string;
  projectId: string;
  projectName: string;
  activityId: string;
  activityName: string;
};

export function useMyProjectActivities() {
  const { user } = useAuth();

  const projectsQuery = useProjectsQuery(1, {
    status: ProjectStatus.ACTIVE,
  });

  const projects = useMemo(() => {
    return projectsQuery.items.filter((project) =>
      project.users?.some((projectUser) => projectUser.id === user?.id),
    );
  }, [projectsQuery.items, user?.id]);

  const items = useMemo<PickerProjectActivity[]>(() => {
    return projects.flatMap((project) =>
      (project.projectActivities ?? [])
        .filter((projectActivity) => projectActivity.isActive)
        .filter((projectActivity) => projectActivity.activity)
        .map((projectActivity) => ({
          id: projectActivity.id,
          projectId: project.id,
          projectName: project.name,
          activityId: projectActivity.activity!.id,
          activityName: projectActivity.activity!.name,
        })),
    );
  }, [projects]);

  const byId = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  return {
    items,
    byId,
    projects,
    isLoading: projectsQuery.isLoading,
    isFetching: projectsQuery.isFetching,
    isError: projectsQuery.isError,
    error: projectsQuery.error,
    refetch: projectsQuery.refetch,
  };
}
