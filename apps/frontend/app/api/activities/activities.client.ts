"use client";

import {
  Activity,
  ActivityListResponse,
  ActivityPayload,
  UpdateActivityPayload,
} from "@/types";
import { createCrudApi } from "../createCrudApi";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";

const crud = createCrudApi<
  Activity,
  ActivityPayload,
  UpdateActivityPayload,
  ActivityListResponse
>({
  endpoint: "activities",
});

export const ActivitiesClientApi = {
  ...crud,

  archive: (id: string) =>
    apiClient<Activity>(() =>
      fetch(`${BASE_API_URL}/activities/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),

  unarchive: (id: string) =>
    apiClient<Activity>(() =>
      fetch(`${BASE_API_URL}/activities/${id}/unarchive`, {
        method: "PATCH",
        credentials: "include",
      }),
    ),
};
