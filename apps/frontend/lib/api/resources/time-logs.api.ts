// "use client";

// import {
//   GetTimelogsQuery,
//   Timelog,
//   TimelogListResponse,
//   TimelogPayload,
//   UpdateTimelogPayload,
// } from "@/types";

// import { apiClient } from "@/lib/api";
// import { API_PROXY_URL } from "@/lib/constants";

// const buildQuery = (query: GetTimelogsQuery = {}) => {
//   const params = new URLSearchParams();

//   Object.entries(query).forEach(([key, value]) => {
//     if (value !== undefined && value !== null) {
//       params.set(key, String(value));
//     }
//   });

//   return params.toString();
// };

// export const TimelogsClientApi = {
//   getAll: (query: GetTimelogsQuery = {}) =>
//     apiClient<TimelogListResponse>(() =>
//       fetch(`${API_PROXY_URL}/time-logs?${buildQuery(query)}`, {
//         credentials: "include",
//       }),
//     ),

//   getById: (id: string) =>
//     apiClient<Timelog>(() =>
//       fetch(`${API_PROXY_URL}/time-logs/${id}`, {
//         credentials: "include",
//       }),
//     ),

//   create: (data: TimelogPayload) =>
//     apiClient<Timelog>(() =>
//       fetch(`${API_PROXY_URL}/time-logs`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         credentials: "include",
//         body: JSON.stringify(data),
//       }),
//     ),

//   update: (id: string, data: UpdateTimelogPayload) =>
//     apiClient<Timelog>(() =>
//       fetch(`${API_PROXY_URL}/time-logs/${id}`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         credentials: "include",
//         body: JSON.stringify(data),
//       }),
//     ),

//   delete: (id: string) =>
//     apiClient<{ success: true }>(() =>
//       fetch(`${API_PROXY_URL}/time-logs/${id}`, {
//         method: "DELETE",
//         credentials: "include",
//       }),
//     ),
// };

"use client";

import {
  GetTimelogsQuery,
  Timelog,
  TimelogListResponse,
  TimelogPayload,
  UpdateTimelogPayload,
} from "@/types";

import { createCrudClient } from "../core";

const crud = createCrudClient<
  Timelog,
  TimelogPayload,
  UpdateTimelogPayload,
  TimelogListResponse,
  GetTimelogsQuery
>({
  endpoint: "time-logs",
});

export const TimelogsClientApi = {
  ...crud,

  getAll: (query?: GetTimelogsQuery) => crud.getAll({ query }),
};
