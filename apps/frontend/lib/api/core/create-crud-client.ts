"use client";

import { createClient } from "./create-client";

type CrudClientConfig = {
  endpoint: string;
};

type GetAllOptions<TQuery> = {
  page?: number;
  query?: TQuery;
};

const buildQuery = (query?: unknown) => {
  const params = new URLSearchParams();

  Object.entries((query ?? {}) as Record<string, unknown>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    },
  );

  return params;
};

export function createCrudClient<
  TEntity,
  TCreate,
  TUpdate,
  TList,
  TQuery = never,
>({ endpoint }: CrudClientConfig) {
  const client = createClient({ endpoint });

  return {
    getAll: (options: number | GetAllOptions<TQuery> = {}) => {
      const page = typeof options === "number" ? options : options.page;
      const query = typeof options === "number" ? undefined : options.query;

      const params = buildQuery(query);

      if (page !== undefined) {
        params.set("page", String(page));
      }

      const suffix = params.toString();

      return client.get<TList>(suffix ? `?${suffix}` : "");
    },

    getById: (id: string) => client.get<TEntity>(`/${id}`),

    create: (data: TCreate) => client.post<TEntity>("", data),

    update: (id: string, data: TUpdate) =>
      client.patch<TEntity>(`/${id}`, data),
  };
}
