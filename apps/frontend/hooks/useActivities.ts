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
import { CATALOG_QUERY_KEYS, queryKeys } from "./shared/queryKeys";

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

export const useActivitiesInfiniteQuery = activitiesQueries.useInfiniteQuery;

export const useActivitiesMutations = createEntityMutations<
  Activity,
  ActivityPayload,
  UpdateActivityPayload,
  Activity,
  Activity
>({
  queryKey: queryKeys.activities.all,

  // Projects offer activities, and a category's panel lists its activities.
  alsoInvalidate: [
    queryKeys.projects.all,
    queryKeys.projectActivities.all,
    queryKeys.activityCategories.all,
  ],

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
  conflictShownInForm: true,
});

export const activityDetailsQuery = (id: string) => ({
  queryKey: queryKeys.activities.detail(id),
  queryFn: () => ActivitiesClientApi.getById(id),
});

export const useActivityDetails = (id: string) =>
  useQuery({ ...activityDetailsQuery(id), enabled: Boolean(id) });

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

/** Taking an activity out of its category archives it rather than moving it. */
export const ARCHIVE_ACTIVITY = "archive";

/**
 * Moves one activity to a category, or archives it, without a toast: like the
 * other pickers, the category's picker applies its changes quietly.
 */
export const useSetActivityCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      categoryId,
    }: {
      id: string;
      /** A category's id, or `ARCHIVE_ACTIVITY`. */
      categoryId: string;
    }) =>
      categoryId === ARCHIVE_ACTIVITY
        ? ActivitiesClientApi.archive(id)
        : ActivitiesClientApi.update(id, { categoryId }),

    onSettled: () => {
      CATALOG_QUERY_KEYS.forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      );
    },
  });
};

type RestoreActivityVariables =
  | { id: string; restoreCategoryId: string }
  | { id: string; moveToCategoryId: string };

/**
 * Restores an activity whose category is archived: by restoring the category,
 * or by moving it to an active one.
 */
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
      CATALOG_QUERY_KEYS.forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      );
    },

    onSuccess: () => toast.success("Activity restored successfully"),
  });
};
