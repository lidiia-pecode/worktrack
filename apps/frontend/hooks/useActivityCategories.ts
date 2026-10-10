"use client";

import {
  ActivityCategory,
  ActivityCategoryListItem,
  ActivityCategoryPayload,
  ActivityCategoryQuery,
  ArchiveActivityCategoryPayload,
  RestoreActivityCategoryPayload,
  UpdateActivityCategoryPayload,
} from "@/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ActivityCategoriesClientApi } from "@/lib/api/resources";

import { createEntityMutations } from "./shared/createEntityMutations";
import { createEntityQuery } from "./shared/createEntityQuery";
import { queryKeys } from "./shared/queryKeys";

type ActivityCategoryQueryParams = Omit<ActivityCategoryQuery, "page">;

const activityCategoriesQueries = createEntityQuery<
  ActivityCategoryListItem,
  ActivityCategoryQueryParams
>({
  queryKey: queryKeys.activityCategories,

  api: {
    getAll: ActivityCategoriesClientApi.getAll,
  },
});

export const useActivityCategoriesQuery = activityCategoriesQueries.useQuery;

export const useActivityCategoriesInfiniteQuery =
  activityCategoriesQueries.useInfiniteQuery;

export const useActivityCategoriesAllPagesQuery =
  activityCategoriesQueries.useAllPagesQuery;

export const useActivityCategoriesMutations = createEntityMutations<
  ActivityCategory,
  ActivityCategoryPayload,
  UpdateActivityCategoryPayload,
  ActivityCategory,
  ActivityCategory
>({
  queryKey: queryKeys.activityCategories.all,

  // Each activity names its category.
  alsoInvalidate: [queryKeys.activities.all],

  api: {
    create: ActivityCategoriesClientApi.create,
    update: ActivityCategoriesClientApi.update,
    archive: ActivityCategoriesClientApi.archive,
    unarchive: ActivityCategoriesClientApi.unarchive,
  },

  messages: {
    create: "Category created successfully",
    update: "Category updated successfully",
    archive: "Category archived successfully",
    unarchive: "Category restored successfully",
  },
});

export const activityCategoryDetailsQuery = (id: string) => ({
  queryKey: queryKeys.activityCategories.detail(id),
  queryFn: () => ActivityCategoriesClientApi.getById(id),
});

export const useActivityCategoryDetails = (id: string) =>
  useQuery({ ...activityCategoryDetailsQuery(id), enabled: Boolean(id) });

/** The active activities archiving a category would block on, read when about to. */
export const useActivityCategoryArchiveImpact = (
  categoryId: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: queryKeys.activityCategories.archiveImpact(categoryId),
    queryFn: () => ActivityCategoriesClientApi.getArchiveImpact(categoryId),
    enabled,
    staleTime: 0,
  });

/** Archives a category, moving or archiving its active activities in the same call. */
export const useArchiveActivityCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ArchiveActivityCategoryPayload;
    }) => ActivityCategoriesClientApi.archive(id, payload),

    onSuccess: () => {
      [
        queryKeys.activityCategories.all,
        queryKeys.activities.all,
        queryKeys.projects.all,
        queryKeys.projectActivities.all,
      ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));

      toast.success("Category archived successfully");
    },
  });
};

export const useRestoreActivityCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: RestoreActivityCategoryPayload;
    }) => ActivityCategoriesClientApi.unarchive(id, payload),

    onSuccess: () => {
      [
        queryKeys.activityCategories.all,
        queryKeys.activities.all,
        queryKeys.projects.all,
        queryKeys.projectActivities.all,
      ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));

      toast.success("Category restored successfully");
    },
  });
};
