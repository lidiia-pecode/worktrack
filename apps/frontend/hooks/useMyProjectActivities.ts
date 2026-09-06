"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { ProjectActivitiesClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

export type PickerProjectActivity = {
  id: string;
  projectId: string;
  projectName: string;
  activityId: string;
  activityName: string;
};

const ASSIGNABLE_PAGE_SIZE = 500;

export function useMyProjectActivities() {
  const query = useQuery({
    queryKey: queryKeys.projectActivities.mine(),
    queryFn: () =>
      ProjectActivitiesClientApi.getMine({ pageSize: ASSIGNABLE_PAGE_SIZE }),
  });

  const items = useMemo<PickerProjectActivity[]>(() => {
    return (query.data?.results ?? []).flatMap((projectActivity) => {
      const project = projectActivity.project;
      const activity = projectActivity.activity;

      if (!project || !activity) {
        return [];
      }

      return [
        {
          id: projectActivity.id,
          projectId: project.id,
          projectName: project.name,
          activityId: activity.id,
          activityName: activity.name,
        },
      ];
    });
  }, [query.data?.results]);

  const byId = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  return {
    items,
    byId,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}
