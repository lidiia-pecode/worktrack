"use client";

import {
  Project,
  ProjectListResponse,
  ProjectPayload,
  UpdateProjectPayload,
} from "@/types";

import { createCrudApi } from "../createCrudApi";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";

const crud = createCrudApi<
  Project,
  ProjectPayload,
  UpdateProjectPayload,
  ProjectListResponse
>({
  endpoint: "projects",
});

export const ProjectsClientApi = {
  ...crud,

  archive: (id: string) =>
    apiClient<Project>(() =>
      fetch(`${BASE_API_URL}/projects/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),

  unarchive: (id: string) =>
    apiClient<Project>(() =>
      fetch(`${BASE_API_URL}/projects/${id}/unarchive`, {
        method: "PATCH",
        credentials: "include",
      }),
    ),
};

// export const ProjectsClientApi = {
//   getAll: (page = 1) =>
//     apiClient<ProjectListResponse>(() =>
//       fetch(`${BASE_API_URL}/projects?page=${page}`, {
//         credentials: "include",
//       }),
//     ),

//   getById: (id: string) =>
//     apiClient<Project>(() =>
//       fetch(`${BASE_API_URL}/projects/${id}`, {
//         credentials: "include",
//       }),
//     ),

//   create: (data: ProjectPayload) =>
//     apiClient<Project>(() =>
//       fetch(`${BASE_API_URL}/projects`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         credentials: "include",
//         body: JSON.stringify(data),
//       }),
//     ),

//   update: (id: string, data: UpdateProjectPayload) =>
//     apiClient<Project>(() =>
//       fetch(`${BASE_API_URL}/projects/${id}`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         credentials: "include",
//         body: JSON.stringify(data),
//       }),
//     ),

//   archive: (id: string) =>
//     apiClient<Project>(() =>
//       fetch(`${BASE_API_URL}/projects/${id}`, {
//         method: "DELETE",
//         credentials: "include",
//       }),
//     ),

//   unarchive: (id: string) =>
//     apiClient<Project>(() =>
//       fetch(`${BASE_API_URL}/projects/${id}/unarchive`, {
//         method: "PATCH",
//         credentials: "include",
//       }),
//     ),

//   // assignUser: (projectId: string, userId: string) =>
//   //   apiClient<Project>(() =>
//   //     fetch(`${BASE_API_URL}/projects/${projectId}/assign`, {
//   //       method: "POST",
//   //       headers: {
//   //         "Content-Type": "application/json",
//   //       },
//   //       credentials: "include",
//   //       body: JSON.stringify({ userId }),
//   //     }),
//   //   ),

//   // unassignUser: (projectId: string, userId: string) =>
//   //   apiClient<Project>(() =>
//   //     fetch(`${BASE_API_URL}/projects/${projectId}/unassign/${userId}`, {
//   //       method: "DELETE",
//   //       credentials: "include",
//   //     }),
//   //   ),

//   // getActivities: (projectId: string) =>
//   //   apiClient<Project><ProjectActivityListResponse>(() =>
//   //     fetch(`${BASE_API_URL}/projects/${projectId}/activities`, {
//   //       credentials: "include",
//   //     }),
//   //   ),

//   // addActivity: (projectId: string, data: ProjectActivityPayload) =>
//   //   apiClient<Project>(() =>
//   //     fetch(`${BASE_API_URL}/projects/${projectId}/activities`, {
//   //       method: "POST",
//   //       headers: {
//   //         "Content-Type": "application/json",
//   //       },
//   //       credentials: "include",
//   //       body: JSON.stringify(data),
//   //     }),
//   //   ),

//   // archiveActivity: (projectId: string, projectActivityId: string) =>
//   //   apiClient<Project>(() =>
//   //     fetch(
//   //       `${BASE_API_URL}/projects/${projectId}/activities/${projectActivityId}`,
//   //       {
//   //         method: "DELETE",
//   //         credentials: "include",
//   //       },
//   //     ),
//   //   ),
// };
