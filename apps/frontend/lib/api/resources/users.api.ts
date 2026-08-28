"use client";

import {
  User,
  UserListResponse,
  UsersQuery,
  UpdateProfilePayload,
  UserDetails,
  CreateUserPayload,
  UpdateUserPayload,
} from "@/types";
import { createClient, createCrudClient } from "../core";

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
  archive: (id: string) => client.archive<User>(`/${id}/archive`),
  unarchive: (id: string) => client.patch<User>(`/${id}/unarchive`),

  updateProfile: (data: UpdateProfilePayload) =>
    client.patch<User>("/me/profile", data),
};
