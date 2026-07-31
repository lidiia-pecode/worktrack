"use client";

import { UpdateUserPayload, UserListResponse, UserPayload } from "@/types";

import { createClient } from "../core";

const client = createClient({
  endpoint: "users",
});

export const UsersClientApi = {
  getAllPaginated: (page = 1, limit = 50) =>
    client.get<UserListResponse>(`?page=${page}&pageSize=${limit}`),

  getAll: (page = 1, limit = 50) =>
    client.get<UserListResponse>(`?page=${page}&pageSize=${limit}`),

  create: (data: UserPayload) => client.post("", data),

  update: (id: string, data: UpdateUserPayload) => client.patch(`/${id}`, data),

  archive: (id: string) => client.delete(`/${id}/archive`),

  unarchive: (id: string) => client.patch(`/${id}/unarchive`),
};
