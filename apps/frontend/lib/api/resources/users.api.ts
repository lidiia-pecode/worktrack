"use client";

import {
  AssignableUserListResponse,
  AssignableUsersQuery,
  DeactivationImpact,
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

  getAssignable: (params?: AssignableUsersQuery) =>
    client.get<AssignableUserListResponse>(
      `/assignable${buildQueryString(params)}`,
    ),

  getDeactivationImpact: (id: string, lastWorkingDay: string) =>
    client.get<DeactivationImpact>(
      `/${id}/deactivation-impact${buildQueryString({ lastWorkingDay })}`,
    ),

  deactivate: (id: string, lastWorkingDay: string) =>
    client.patch<User>(`/${id}/archive`, { lastWorkingDay }),
  reactivate: (id: string, firstDayBack: string) =>
    client.patch<User>(`/${id}/unarchive`, { firstDayBack }),

  updateProfile: (data: UpdateProfilePayload) =>
    client.patch<User>("/me/profile", data),
};
