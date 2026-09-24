"use client";

import {
  keepPreviousData,
  QueryKey,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";

import { PaginatedResponse } from "@/types";

type EntityQueryApi<TEntity, TParams> = {
  getAll: (
    params: TParams & { page: number },
  ) => Promise<PaginatedResponse<TEntity>>;
};

type CreateEntityQueryConfig<TEntity, TParams> = {
  queryKey: {
    list: (page: number, params?: TParams) => QueryKey;
    infinite: (params?: TParams) => QueryKey;
  };
  api: EntityQueryApi<TEntity, TParams>;
  keepPreviousData?: boolean;
};

export function createEntityQuery<
  TEntity,
  TParams extends Record<string, unknown> = Record<string, never>,
>(config: CreateEntityQueryConfig<TEntity, TParams>) {
  const useEntityQuery = (page = 1, params?: TParams) => {
    const query = useQuery({
      queryKey: config.queryKey.list(page, params),
      queryFn: () =>
        config.api.getAll({
          ...params,
          page,
        } as TParams & { page: number }),
      placeholderData: config.keepPreviousData ? keepPreviousData : undefined,
    });

    return {
      items: query.data?.results ?? [],
      count: query.data?.count ?? 0,
      query,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isPlaceholderData: query.isPlaceholderData,
      isError: query.isError,
      error: query.error ?? null,
      refetch: query.refetch,
    };
  };

  const useEntityInfiniteQuery = (
    params?: TParams,
    options: { enabled?: boolean } = {},
  ) => {
    const query = useInfiniteQuery({
      queryKey: config.queryKey.infinite(params),
      enabled: options.enabled,
      queryFn: ({ pageParam }) =>
        config.api.getAll({
          ...params,
          page: pageParam,
        } as TParams & { page: number }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) => {
        const loadedItems = pages.reduce(
          (total, page) => total + page.results.length,
          0,
        );

        return loadedItems < lastPage.count ? pages.length + 1 : undefined;
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
  };

  return {
    useQuery: useEntityQuery,
    useInfiniteQuery: useEntityInfiniteQuery,
  };
}
