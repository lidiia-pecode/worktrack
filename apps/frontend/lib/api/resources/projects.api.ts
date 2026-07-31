// "use client";

// import {
//   Project,
//   ProjectListResponse,
//   ProjectPayload,
//   UpdateProjectPayload,
// } from "@/types";
// import { API_PROXY_URL } from "@/lib/constants";
// import { apiClient } from "@/lib/api";
// import { createCrudClient } from "../core";

// const crud = createCrudClient<
//   Project,
//   ProjectPayload,
//   UpdateProjectPayload,
//   ProjectListResponse
// >({
//   endpoint: "projects",
// });

// export const ProjectsClientApi = {
//   ...crud,

//   archive: (id: string) =>
//     apiClient<Project>(() =>
//       fetch(`${API_PROXY_URL}/projects/${id}`, {
//         method: "DELETE",
//         credentials: "include",
//       }),
//     ),

//   unarchive: (id: string) =>
//     apiClient<Project>(() =>
//       fetch(`${API_PROXY_URL}/projects/${id}/unarchive`, {
//         method: "PATCH",
//         credentials: "include",
//       }),
//     ),
// };

"use client";

import {
  Project,
  ProjectListResponse,
  ProjectPayload,
  UpdateProjectPayload,
} from "@/types";

import { createCrudClient, createClient } from "../core";

const crud = createCrudClient<
  Project,
  ProjectPayload,
  UpdateProjectPayload,
  ProjectListResponse
>({
  endpoint: "projects",
});

const client = createClient({
  endpoint: "projects",
});

export const ProjectsClientApi = {
  ...crud,

  archive: (id: string) => client.delete<Project>(`/${id}/archive`),

  unarchive: (id: string) => client.patch<Project>(`/${id}/unarchive`),
};
