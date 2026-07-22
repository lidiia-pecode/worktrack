"use client";

import {
  ActivityCategory,
  ActivityCategoryPayload,
  UpdateActivityCategoryPayload,
} from "@/types";
import { createEntityQuery } from "./shared/createEntityQuery";
import { queryKeys } from "./shared/queryKeys";
import { ActivityCategoriesClientApi } from "@/app/api/activity-categories/activity-categories-client";
import { createEntityMutations } from "./shared/createEntityMutations";

export const useActCategoriesQuery = createEntityQuery<ActivityCategory>({
  queryKey: queryKeys.activityCategories,
  api: {
    getAll: ActivityCategoriesClientApi.getAll,
  },
});

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
    create: "Activity created successfully",
    update: "Activity updated successfully",
    archive: "Activity archived successfully",
    unarchive: "Activity restored successfully",
  },
});

export function useActivityCategories(page = 1) {
  const query = useActCategoriesQuery(page);
  const actions = useActivityCategoriesMutations();

  return {
    ...query,
    actions,
  };
}
