"use client";

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { QueryKey } from "@tanstack/react-query";
import { PaginatedResponse } from "@/types";

type EntityQueryApi<TEntity> = {
  getAll: (page: number) => Promise<PaginatedResponse<TEntity>>;
};

type CreateEntityQueryConfig<TEntity> = {
  queryKey: {
    list: (page: number) => QueryKey;
  };

  api: EntityQueryApi<TEntity>;
};

export type EntityQueryResult<TEntity> = {
  items: TEntity[];
  count: number;

  query: UseQueryResult<PaginatedResponse<TEntity>, Error>;

  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;

  error: Error | null;

  refetch: () => Promise<unknown>;
};

export function createEntityQuery<TEntity>(
  config: CreateEntityQueryConfig<TEntity>,
) {
  return function useEntityQuery(page: number = 1): EntityQueryResult<TEntity> {
    const query = useQuery({
      queryKey: config.queryKey.list(page),

      queryFn: () => config.api.getAll(page),
    });

    return {
      items: query.data?.results ?? [],

      count: query.data?.count ?? 0,

      query,

      isLoading: query.isLoading,

      isFetching: query.isFetching,

      isError: query.isError,

      error: query.error ?? null,

      refetch: query.refetch,
    };
  };
}
