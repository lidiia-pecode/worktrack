"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import {
  ProjectsClientApi,
  ProjectActivitiesClientApi,
} from "@/lib/api/resources";
import { queryKeys } from "./shared/queryKeys";
import { useMe } from "./useMe";

export type PickerProjectActivity = {
  id: string;
  projectId: string;
  projectName: string;
  activityId: string;
  activityName: string;
};

export function useMyProjectActivities() {
  const { data: me } = useMe();

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.picker(),
    queryFn: () => ProjectsClientApi.getAll(1),
    enabled: !!me,
  });

  const myProjects = (projectsQuery.data?.results ?? []).filter((project) =>
    project.users?.some((u) => u.id === me?.id),
  );

  const activityQueries = useQueries({
    queries: myProjects.map((project) => ({
      queryKey: queryKeys.projectActivities.list(project.id),
      queryFn: () => ProjectActivitiesClientApi.getAll(project.id),
      enabled: !!me,
    })),
  });

  const isLoading =
    !!me &&
    (projectsQuery.isLoading || activityQueries.some((q) => q.isLoading));

  const items: PickerProjectActivity[] = myProjects.flatMap((project, idx) => {
    const result = activityQueries[idx]?.data;
    return (result?.results ?? [])
      .filter((pa) => pa.isActive)
      .map((pa) => ({
        id: pa.id,
        projectId: project.id,
        projectName: project.name,
        activityId: pa.activity.id,
        activityName: pa.activity.name,
      }));
  });

  const byId = Object.fromEntries(items.map((item) => [item.id, item]));

  activityQueries.forEach((q) => {
    console.log(q.error);
  });

  return { items, byId, projects: myProjects, isLoading };
}
