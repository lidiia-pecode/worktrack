// "use client";

// import { UpdateUserPayload, UserListResponse, UserPayload } from "@/types";

// import { createClient } from "../core";

// const client = createClient({
//   endpoint: "users",
// });

// export const UsersClientApi = {
//   getAllPaginated: (page = 1, limit = 50) =>
//     client.get<UserListResponse>(`?page=${page}&pageSize=${limit}`),

//   getAll: (page = 1, limit = 50) =>
//     client.get<UserListResponse>(`?page=${page}&pageSize=${limit}`),

//   create: (data: UserPayload) => client.post("", data),

//   update: (id: string, data: UpdateUserPayload) => client.patch(`/${id}`, data),

//   archive: (id: string) => client.archive(`/${id}/archive`),

//   unarchive: (id: string) => client.patch(`/${id}/unarchive`),
// };

"use client";

import {
  User,
  UserListResponse,
  UserPayload,
  UpdateUserPayload,
  UserQuery,
} from "@/types";
import { createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  User,
  UserPayload,
  UpdateUserPayload,
  UserListResponse,
  UserQuery
>({ endpoint: "users" });

const client = createClient({ endpoint: "users" });

export const UsersClientApi = {
  ...crud,
  archive: (id: string) => client.archive<User>(`/${id}/archive`),
  unarchive: (id: string) => client.patch<User>(`/${id}/unarchive`),
};
