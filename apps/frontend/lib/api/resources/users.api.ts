"use client";

import {
  AssignableUserListResponse,
  User,
  UserListResponse,
  UsersQuery,
  UpdateProfilePayload,
  UserDetails,
  CreateUserPayload,
  UpdateUserPayload,
} from "@/types";
import { buildQueryString, createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UserListResponse,
  UsersQuery,
  UserDetails
>({ endpoint: "users" });

const client = createClient({ endpoint: "users" });

export const UsersClientApi = {
  ...crud,

  getAssignable: (params?: UsersQuery) =>
    client.get<AssignableUserListResponse>(
      `/assignable${buildQueryString(params)}`,
    ),

  archive: (id: string) => client.archive<User>(`/${id}/archive`),
  unarchive: (id: string) => client.patch<User>(`/${id}/unarchive`),

  updateProfile: (data: UpdateProfilePayload) =>
    client.patch<User>("/me/profile", data),
};
