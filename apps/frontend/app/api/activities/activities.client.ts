"use client";

import {
  Activity,
  ActivityListResponse,
  ActivityPayload,
  UpdateActivityPayload,
} from "@/types";
import { createCrudApi } from "../createCrudApi";

export const ActivitiesClientApi = createCrudApi<
  Activity,
  ActivityPayload,
  UpdateActivityPayload,
  ActivityListResponse
>({
  endpoint: "activities",
});

// import {
//   ActivityPayload,
//   ActivityListResponse,
//   UpdateActivityPayload,
//   Activity,
// } from "@/types/Activities";
// import { BASE_API_URL } from "../api-consts";
// import { apiClient } from "../apiClient";

// export const ActivitiesClientApi = {
//   getAllPaginated: (page = 1, limit = 50) =>
//     apiClient<ActivityListResponse>(() =>
//       fetch(`${BASE_API_URL}/activities?page=${page}&limit=${limit}`, {
//         credentials: "include",
//       }),
//     ),

//   create: (data: ActivityPayload) =>
//     apiClient<Activity>(() =>
//       fetch(`${BASE_API_URL}/activities`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify(data),
//       }),
//     ),

//   update: (id: string, data: UpdateActivityPayload) =>
//     apiClient<Activity>(() =>
//       fetch(`${BASE_API_URL}/activities/${id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify(data),
//       }),
//     ),

//   delete: (id: string) =>
//     apiClient<Activity>(() =>
//       fetch(`${BASE_API_URL}/activities/${id}`, {
//         method: "DELETE",
//         credentials: "include",
//       }),
//     ),
// };
