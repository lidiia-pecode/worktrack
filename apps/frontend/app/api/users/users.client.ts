import { UpdateUserPayload, User, UserPayload } from "@/types";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";

type PaginatedUsers = {
  count: number;
  results: User[];
};

export const UsersClientApi = {
  getAllPaginated: async (page = 1, limit = 50) => {
    const res = await apiClient(() =>
      fetch(`${BASE_API_URL}/users?page=${page}&limit=${limit}`, {
        credentials: "include",
      }),
    );

    return res as PaginatedUsers;
  },

  create: (data: UserPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  update: (id: string, data: UpdateUserPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  delete: (id: string) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),
};
