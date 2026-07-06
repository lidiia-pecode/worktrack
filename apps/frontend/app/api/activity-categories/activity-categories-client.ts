"use client";

import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";
import {
  ActivityCategoryPayload,
  ActivityCategoryListResponse,
  UpdateActivityCategoryPayload,
} from "@/types/ActivityCategory";

export const ActivityCategoriesClientApi = {
  getAll: (page = 1) =>
    apiClient<ActivityCategoryListResponse>(() =>
      fetch(`${BASE_API_URL}/activity-categories?page=${page}`, {
        credentials: "include",
      }),
    ),

  create: (data: ActivityCategoryPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/activity-categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  update: (id: string, data: UpdateActivityCategoryPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/activity-categories/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  delete: (id: string) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/activity-categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),
};
