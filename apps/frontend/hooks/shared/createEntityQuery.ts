"use client";

import { useQuery, useInfiniteQuery, QueryKey } from "@tanstack/react-query";
import { PaginatedResponse } from "@/types";

type EntityQueryApi<TEntity> = {
  getAll: (params: { page: number }) => Promise<PaginatedResponse<TEntity>>;
};

type CreateEntityQueryConfig<TEntity> = {
  queryKey: {
    list: (page: number) => QueryKey;
    infinite: () => QueryKey;
  };
  api: EntityQueryApi<TEntity>;
};

export function createEntityQuery<TEntity>(
  config: CreateEntityQueryConfig<TEntity>,
) {
  return {
    // 1. Класичний хук зі звичайною пагінацією (для сторінок)
    useQuery: (page: number = 1) => {
      const query = useQuery({
        queryKey: config.queryKey.list(page),
        queryFn: () => config.api.getAll({ page }),
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
    },

    // 2. Інфініт-хук для скролу, сайдбарів та випадаючих списків (dropdowns)
    useInfiniteQuery: () => {
      const query = useInfiniteQuery({
        queryKey: config.queryKey.infinite(),
        queryFn: ({ pageParam }) =>
          config.api.getAll({ page: pageParam as number }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, pages) => {
          const loaded = pages.flatMap((page) => page.results).length;
          return loaded < lastPage.count ? pages.length + 1 : undefined;
        },
      });

      const items = query.data?.pages.flatMap((page) => page.results) ?? [];
      const count = query.data?.pages[0]?.count ?? 0;

      return {
        items,
        count,
        query,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isError: query.isError,
        error: query.error ?? null,
        refetch: query.refetch,
        pagination: {
          fetchNextPage: query.fetchNextPage,
          hasNextPage: Boolean(query.hasNextPage),
          isFetchingNextPage: query.isFetchingNextPage,
        },
      };
    },
  };
}
