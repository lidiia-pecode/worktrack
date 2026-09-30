"use client";

import {
  AssignableUserListResponse,
  User,
  UserListResponse,
  UsersQuery,
  UpdateProfilePayload,
  UserDetails,
  UpdateUserPayload,
} from "@/types";
import { buildQueryString, createClient, createCrudClient } from "../core";

// People join only by invitation, so users have no create route.
const crud = createCrudClient<
  User,
  never,
  UpdateUserPayload,
  UserListResponse,
  UsersQuery,
  UserDetails
>({ endpoint: "users" });

const client = createClient({ endpoint: "users" });

export const UsersClientApi = {
  getAll: crud.getAll,
  getById: crud.getById,
  update: crud.update,

  getAssignable: (params?: UsersQuery) =>
    client.get<AssignableUserListResponse>(
      `/assignable${buildQueryString(params)}`,
    ),

  archive: (id: string) => client.archive<User>(`/${id}/archive`),
  unarchive: (id: string) => client.patch<User>(`/${id}/unarchive`),

  updateProfile: (data: UpdateProfilePayload) =>
    client.patch<User>("/me/profile", data),
};
