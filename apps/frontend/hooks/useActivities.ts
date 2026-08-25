"use client";

import { Activity, ActivityPayload, UpdateActivityPayload } from "@/types";
import { ActivitiesClientApi } from "@/lib/api/resources";
import { createEntityMutations } from "./shared/createEntityMutations";
import { createEntityQuery } from "./shared/createEntityQuery";
import { queryKeys } from "./shared/queryKeys";

const activitiesQueries = createEntityQuery<Activity>({
  queryKey: queryKeys.activities,
  api: {
    getAll: ActivitiesClientApi.getAll,
  },
});

export const useActivitiesQuery = activitiesQueries.useQuery;
export const useActivitiesInfiniteQuery = activitiesQueries.useInfiniteQuery;

const useActivitiesMutations = createEntityMutations<
  Activity,
  ActivityPayload,
  UpdateActivityPayload,
  Activity,
  Activity
>({
  queryKey: queryKeys.activities.all,

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

export function useActivities(page = 1) {
  const query = useActivitiesQuery(page);
  const actions = useActivitiesMutations();

  return {
    ...query,
    actions,
  };
}
