// "use client";

// import { API_PROXY_URL } from "@/lib/constants";
// import { apiClient } from "@/lib/api";
// import { createCrudClient } from "../core/";

// import {
//   ActivityCategory,
//   ActivityCategoryPayload,
//   ActivityCategoryListResponse,
//   UpdateActivityCategoryPayload,
// } from "@/types/ActivityCategory";

// export const crud = createCrudClient<
//   ActivityCategory,
//   ActivityCategoryPayload,
//   UpdateActivityCategoryPayload,
//   ActivityCategoryListResponse
// >({
//   endpoint: "activity-categories",
// });

// export const ActivityCategoriesClientApi = {
//   ...crud,

//   archive: (id: string) =>
//     apiClient<ActivityCategory>(() =>
//       fetch(`${API_PROXY_URL}/activity-categories/${id}`, {
//         method: "DELETE",
//         credentials: "include",
//       }),
//     ),

//   unarchive: (id: string) =>
//     apiClient<ActivityCategory>(() =>
//       fetch(`${API_PROXY_URL}/activity-categories/${id}/unarchive`, {
//         method: "PATCH",
//         credentials: "include",
//       }),
//     ),
// };

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
>({
  endpoint: "activity-categories",
});

const client = createClient({
  endpoint: "activity-categories",
});

export const ActivityCategoriesClientApi = {
  ...crud,

  archive: (id: string) => client.delete<ActivityCategory>(`/${id}`),

  unarchive: (id: string) => client.patch<ActivityCategory>(`/${id}/unarchive`),
};
