"use client";

import {
  ActivityCategory,
  ActivityCategoryListResponse,
  ActivityCategoryPayload,
  UpdateActivityCategoryPayload,
} from "@/types/ActivityCategory";

import { createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  ActivityCategory,
  ActivityCategoryPayload,
  UpdateActivityCategoryPayload,
  ActivityCategoryListResponse
>({ endpoint: "activity-categories" });

const client = createClient({ endpoint: "activity-categories" });

export const ActivityCategoriesClientApi = {
  ...crud,
  archive: (id: string) => client.archive<ActivityCategory>(`/${id}/archive`),
  unarchive: (id: string) => client.patch<ActivityCategory>(`/${id}/unarchive`),
};
