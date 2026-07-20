"use client";

import { BASE_API_URL } from "./api-consts";
import { apiClient } from "./apiClient";

type CrudApiConfig = {
  endpoint: string;
};

export function createCrudApi<TEntity, TCreate, TUpdate, TList>({
  endpoint,
}: CrudApiConfig) {
  return {
    getAll: (page = 1) =>
      apiClient<TList>(() =>
        fetch(`${BASE_API_URL}/${endpoint}?page=${page}`, {
          credentials: "include",
        }),
      ),

    getById: (id: string) =>
      apiClient<TEntity>(() =>
        fetch(`${BASE_API_URL}/${endpoint}/${id}`, {
          credentials: "include",
        }),
      ),

    create: (data: TCreate) =>
      apiClient<TEntity>(() =>
        fetch(`${BASE_API_URL}/${endpoint}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }),
      ),

    update: (id: string, data: TUpdate) =>
      apiClient<TEntity>(() =>
        fetch(`${BASE_API_URL}/${endpoint}/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }),
      ),

    delete: (id: string) =>
      apiClient<TEntity>(() =>
        fetch(`${BASE_API_URL}/${endpoint}/${id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      ),
  };
}
