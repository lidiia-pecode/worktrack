"use client";

import { createClient } from "./create-client";

type CrudClientConfig = {
  endpoint: string;
};

type GetAllOptions<TQuery extends object> = {
  page?: number;
} & TQuery;

const buildQuery = (query?: object): URLSearchParams => {
  const params = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });

  return params;
};

export function createCrudClient<
  TEntity,
  TCreate,
  TUpdate,
  TList,
  TQuery extends object = object,
  TDetails = TEntity,
>({ endpoint }: CrudClientConfig) {
  const client = createClient({ endpoint });

  const getAll = (options?: number | GetAllOptions<TQuery>) => {
    const query = typeof options === "number" ? { page: options } : options;

    const params = buildQuery(query);
    const queryString = params.toString();

    return client.get<TList>(queryString ? `?${queryString}` : "");
  };

  return {
    getAll,

    getById: (id: string) => client.get<TDetails>(`/${id}`),

    create: (data: TCreate) => client.post<TEntity>("", data),

    update: (id: string, data: TUpdate) =>
      client.patch<TEntity>(`/${id}`, data),
  };
}
