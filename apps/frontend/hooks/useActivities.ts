"use client";

import { Activity, ActivityPayload, UpdateActivityPayload } from "@/types";
import { createEntityQuery } from "./shared/createEntityQuery";
import { queryKeys } from "./shared/queryKeys";
import { ActivitiesClientApi } from "@/app/api/activities/activities.client";
import { createEntityMutations } from "./shared/createEntityMutations";

const useActivitiesQuery = createEntityQuery<Activity>({
  queryKey: queryKeys.activities,
  api: {
    getAll: ActivitiesClientApi.getAll,
  },
});

const useActivitiesMutations = createEntityMutations<
  Activity,
  ActivityPayload,
  UpdateActivityPayload,
  Activity
>({
  queryKey: queryKeys.activities.all,

  api: {
    create: ActivitiesClientApi.create,
    update: ActivitiesClientApi.update,
    delete: ActivitiesClientApi.delete,
  },

  messages: {
    create: "Activity created successfully",
    update: "Activity updated successfully",
    delete: "Activity deleted successfully",
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
