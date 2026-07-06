"use client";

import {
  ActivityPayload,
  ActivityListResponse,
  UpdateActivityPayload,
} from "@/types/Activities";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";

export const ActivitiesClientApi = {
  getAll: (page = 1) =>
    apiClient<ActivityListResponse>(() =>
      fetch(`${BASE_API_URL}/activities?page=${page}`, {
        credentials: "include",
      }),
    ),

  create: (data: ActivityPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  update: (id: string, data: UpdateActivityPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  delete: (id: string) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/activities/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),
};
