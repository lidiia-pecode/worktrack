// import { UpdateUserPayload, UserListResponse, UserPayload } from "@/types";

// import { apiClient } from "@/lib/api";
// import { API_PROXY_URL } from "@/lib/constants";

// export const UsersClientApi = {
//   getAllPaginated: async (page = 1, limit = 50) =>
//     apiClient<UserListResponse>(() =>
//       fetch(`${API_PROXY_URL}/users?page=${page}&limit=${limit}`, {
//         credentials: "include",
//       }),
//     ),

//   create: (data: UserPayload) =>
//     apiClient(() =>
//       fetch(`${API_PROXY_URL}/users`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify(data),
//       }),
//     ),

//   update: (id: string, data: UpdateUserPayload) =>
//     apiClient(() =>
//       fetch(`${API_PROXY_URL}/users/${id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify(data),
//       }),
//     ),

//   delete: (id: string) =>
//     apiClient(() =>
//       fetch(`${API_PROXY_URL}/users/${id}`, {
//         method: "DELETE",
//         credentials: "include",
//       }),
//     ),
// };

"use client";

import { UpdateUserPayload, UserListResponse, UserPayload } from "@/types";

import { createClient } from "../core";

const client = createClient({
  endpoint: "users",
});

export const UsersClientApi = {
  getAllPaginated: (page = 1, limit = 50) =>
    client.get<UserListResponse>(`?page=${page}&limit=${limit}`),

  create: (data: UserPayload) => client.post("", data),

  update: (id: string, data: UpdateUserPayload) => client.patch(`/${id}`, data),

  delete: (id: string) => client.delete(`/${id}`),
};
