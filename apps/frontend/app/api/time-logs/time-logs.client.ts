"use client";

import {
  GetTimelogsQuery,
  Timelog,
  TimelogListResponse,
  TimelogPayload,
  UpdateTimelogPayload,
} from "@/types";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";

const buildQuery = (query: GetTimelogsQuery = {}) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });

  return params.toString();
};

export const TimelogsClientApi = {
  getAll: (query: GetTimelogsQuery = {}) =>
    apiClient<TimelogListResponse>(() =>
      fetch(`${BASE_API_URL}/time-logs?${buildQuery(query)}`, {
        credentials: "include",
      }),
    ),

  getById: (id: string) =>
    apiClient<Timelog>(() =>
      fetch(`${BASE_API_URL}/time-logs/${id}`, {
        credentials: "include",
      }),
    ),

  create: (data: TimelogPayload) =>
    apiClient<Timelog>(() =>
      fetch(`${BASE_API_URL}/time-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  update: (id: string, data: UpdateTimelogPayload) =>
    apiClient<Timelog>(() =>
      fetch(`${BASE_API_URL}/time-logs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  delete: (id: string) =>
    apiClient<{ success: true }>(() =>
      fetch(`${BASE_API_URL}/time-logs/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),
};
