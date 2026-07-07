"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { ProjectsClientApi } from "@/app/api/projects/projects.client";
import { ProjectActivitiesClientApi } from "@/app/api/activities/project-activities.client";
import { useMe } from "./useMe";

export type PickerProjectActivity = {
  /** ProjectActivity id — this is what gets sent as TimeLogPayload.projectActivityId */
  id: string;
  projectId: string;
  projectName: string;
  activityId: string;
  activityName: string;
};

/**
 * Resolves the projects the current user belongs to, and the activities
 * enabled on each of them. Flattened into a single list for the Quick Log
 * picker, plus an id -> item lookup map used to render project/activity
 * names for existing time logs (which only carry projectActivityId).
 */
export function useMyProjectActivities() {
  const { data: me } = useMe();

  const projectsQuery = useQuery({
    queryKey: ["projects", "for-picker"],
    queryFn: () => ProjectsClientApi.getAll(1),
    enabled: !!me,
  });

  const myProjects = (projectsQuery.data?.results ?? []).filter((project) =>
    project.users?.some((u) => u.id === me?.id),
  );

  const activityQueries = useQueries({
    queries: myProjects.map((project) => ({
      queryKey: ["projectActivities", project.id],
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

  return { items, byId, projects: myProjects, isLoading };
}
