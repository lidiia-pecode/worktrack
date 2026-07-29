// "use client";

// import {
//   Activity,
//   ActivityListResponse,
//   ActivityPayload,
//   UpdateActivityPayload,
// } from "@/types";
// import { API_PROXY_URL } from "@/lib/constants";
// import { apiClient } from "@/lib/api";
// import { createCrudClient } from "../core";

// const crud = createCrudClient<
//   Activity,
//   ActivityPayload,
//   UpdateActivityPayload,
//   ActivityListResponse
// >({
//   endpoint: "activities",
// });

// export const ActivitiesClientApi = {
//   ...crud,

//   archive: (id: string) =>
//     apiClient<Activity>(() =>
//       fetch(`${API_PROXY_URL}/activities/${id}`, {
//         method: "DELETE",
//         credentials: "include",
//       }),
//     ),

//   unarchive: (id: string) =>
//     apiClient<Activity>(() =>
//       fetch(`${API_PROXY_URL}/activities/${id}/unarchive`, {
//         method: "PATCH",
//         credentials: "include",
//       }),
//     ),
// };

"use client";

import {
  Activity,
  ActivityListResponse,
  ActivityPayload,
  UpdateActivityPayload,
} from "@/types";

import { createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  Activity,
  ActivityPayload,
  UpdateActivityPayload,
  ActivityListResponse
>({
  endpoint: "activities",
});

const client = createClient({
  endpoint: "activities",
});

export const ActivitiesClientApi = {
  ...crud,

  archive: (id: string) => client.delete<Activity>(`/${id}`),

  unarchive: (id: string) => client.patch<Activity>(`/${id}/unarchive`),
};
