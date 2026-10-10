"use client";

import {
  ActivityCategory,
  ActivityCategoryArchiveImpact,
  ActivityCategoryDetails,
  ActivityCategoryListResponse,
  ActivityCategoryPayload,
  ActivityCategoryQuery,
  ArchiveActivityCategoryPayload,
  UpdateActivityCategoryPayload,
} from "@/types/ActivityCategory";

import { createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  ActivityCategory,
  ActivityCategoryPayload,
  UpdateActivityCategoryPayload,
  ActivityCategoryListResponse,
  Omit<ActivityCategoryQuery, "page">,
  ActivityCategoryDetails
>({
  endpoint: "activity-categories",
});

const client = createClient({
  endpoint: "activity-categories",
});

export const ActivityCategoriesClientApi = {
  ...crud,

  getArchiveImpact: (id: string) =>
    client.get<ActivityCategoryArchiveImpact>(`/${id}/archive-impact`),

  archive: (id: string, payload?: ArchiveActivityCategoryPayload) =>
    client.patch<ActivityCategory>(`/${id}/archive`, payload),

  unarchive: (id: string) => client.patch<ActivityCategory>(`/${id}/unarchive`),
};
