"use client";

import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";
import { createCrudApi } from "../createCrudApi";

import {
  ActivityCategory,
  ActivityCategoryPayload,
  ActivityCategoryListResponse,
  UpdateActivityCategoryPayload,
} from "@/types/ActivityCategory";

export const crud = createCrudApi<
  ActivityCategory,
  ActivityCategoryPayload,
  UpdateActivityCategoryPayload,
  ActivityCategoryListResponse
>({
  endpoint: "activity-categories",
});

export const ActivityCategoriesClientApi = {
  ...crud,

  archive: (id: string) =>
    apiClient<ActivityCategory>(() =>
      fetch(`${BASE_API_URL}/activity-categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),

  unarchive: (id: string) =>
    apiClient<ActivityCategory>(() =>
      fetch(`${BASE_API_URL}/activity-categories/${id}/unarchive`, {
        method: "PATCH",
        credentials: "include",
      }),
    ),
};
