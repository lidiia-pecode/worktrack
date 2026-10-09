"use client";

import {
  Activity,
  ActivityListItem,
  ActivityPayload,
  ActivityQuery,
  UpdateActivityPayload,
} from "@/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  ActivitiesClientApi,
  ActivityCategoriesClientApi,
} from "@/lib/api/resources";

import { createEntityMutations } from "./shared/createEntityMutations";
import { createEntityQuery } from "./shared/createEntityQuery";
import { queryKeys } from "./shared/queryKeys";

type ActivityQueryParams = Omit<ActivityQuery, "page">;

const activitiesQueries = createEntityQuery<
  ActivityListItem,
  ActivityQueryParams
>({
  queryKey: queryKeys.activities,

  api: {
    getAll: ActivitiesClientApi.getAll,
  },
});

export const useActivitiesQuery = activitiesQueries.useQuery;

export const useActivitiesInfiniteQuery = activitiesQueries.useInfiniteQuery;

export const useActivitiesMutations = createEntityMutations<
  Activity,
  ActivityPayload,
  UpdateActivityPayload,
  Activity,
  Activity
>({
  queryKey: queryKeys.activities.all,

  alsoInvalidate: [queryKeys.projects.all, queryKeys.projectActivities.all],

  api: {
    create: ActivitiesClientApi.create,
    update: ActivitiesClientApi.update,
    archive: ActivitiesClientApi.archive,
    unarchive: ActivitiesClientApi.unarchive,
  },

  messages: {
    create: "Activity created successfully",
    update: "Activity updated successfully",
    archive: "Activity archived successfully",
    unarchive: "Activity restored successfully",
  },
});

/** The projects archiving an activity would take it off, read when about to. */
export const useActivityArchiveImpact = (
  activityId: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: queryKeys.activities.archiveImpact(activityId),
    queryFn: () => ActivitiesClientApi.getArchiveImpact(activityId),
    enabled,
    staleTime: 0,
  });

type RestoreActivityVariables =
  | { id: string; restoreCategoryId: string }
  | { id: string; moveToCategoryId: string };

/** Restores an activity whose category is archived, by restoring the category or moving it. */
export const useRestoreActivityWithCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: RestoreActivityVariables) => {
      if ("restoreCategoryId" in variables) {
        await ActivityCategoriesClientApi.unarchive(
          variables.restoreCategoryId,
        );
        return ActivitiesClientApi.unarchive(variables.id);
      }

      return ActivitiesClientApi.unarchive(variables.id, {
        categoryId: variables.moveToCategoryId,
      });
    },

    onSettled: () => {
      [
        queryKeys.activities.all,
        queryKeys.activityCategories.all,
        queryKeys.projects.all,
        queryKeys.projectActivities.all,
      ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    },

    onSuccess: () => toast.success("Activity restored successfully"),
  });
};
