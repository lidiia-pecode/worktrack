"use client";

import { buildQueryString } from "./build-query-string";
import { createClient } from "./create-client";

type CrudClientConfig = {
  endpoint: string;
};

type GetAllOptions<TQuery extends object> = {
  page?: number;
} & TQuery;

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

    return client.get<TList>(buildQueryString(query));
  };

  return {
    getAll,

    getById: (id: string) => client.get<TDetails>(`/${id}`),

    create: (data: TCreate) => client.post<TEntity>("", data),

    update: (id: string, data: TUpdate) =>
      client.patch<TEntity>(`/${id}`, data),
  };
}
