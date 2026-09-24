"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { ProjectActivitiesClientApi } from "@/lib/api/resources";

import { fetchAllPages } from "./shared/fetchAllPages";
import { queryKeys } from "./shared/queryKeys";

export type PickerProjectActivity = {
  id: string;
  projectId: string;
  projectName: string;
  activityId: string;
  activityName: string;
};

/**
 * The project/activity options someone may log time against, flattened for the
 * form picker. Without a `userId` it answers for the caller; with one it
 * answers for that person, which is how a manager logs time on their behalf.
 * Pass `undefined` to skip the request entirely.
 */
export function useAssignableActivities(userId?: string, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.projectActivities.assignable({ userId }),
    queryFn: () =>
      fetchAllPages((page, pageSize) =>
        ProjectActivitiesClientApi.getAssignable({ page, pageSize, userId }),
      ),
    enabled,
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
