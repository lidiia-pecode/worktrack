"use client";

import {
  ActivityCategory,
  ActivityCategoryPayload,
  UpdateActivityCategoryPayload,
} from "@/types";
import { ActivityCategoriesClientApi } from "@/lib/api/resources";
import { queryKeys } from "./shared/queryKeys";
import { createEntityQuery } from "./shared/createEntityQuery";
import { createEntityMutations } from "./shared/createEntityMutations";

const activityCategoriesQueries = createEntityQuery<ActivityCategory>({
  queryKey: queryKeys.activityCategories,
  api: {
    getAll: ActivityCategoriesClientApi.getAll,
  },
});

export const useActivityCategoriesQuery = activityCategoriesQueries.useQuery;
export const useActivityCategoriesInfiniteQuery =
  activityCategoriesQueries.useInfiniteQuery;

export const useActivityCategoriesMutations = createEntityMutations<
  ActivityCategory,
  ActivityCategoryPayload,
  UpdateActivityCategoryPayload,
  ActivityCategory,
  ActivityCategory
>({
  queryKey: queryKeys.activityCategories.all,

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

export function useActivityCategories(page = 1) {
  const query = useActivityCategoriesQuery(page);
  const actions = useActivityCategoriesMutations();

  return {
    ...query,
    actions,
  };
}
