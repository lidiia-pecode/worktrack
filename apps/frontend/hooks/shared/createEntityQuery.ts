"use client";

import {
  keepPreviousData,
  QueryKey,
  useInfiniteQuery,
  useQuery,
  UseQueryResult,
} from "@tanstack/react-query";

import { PaginatedResponse } from "@/types";

import { fetchAllPages } from "./fetchAllPages";

type PageParams = { page: number; pageSize?: number };

type EntityQueryApi<TEntity, TParams> = {
  getAll: (params: TParams & PageParams) => Promise<PaginatedResponse<TEntity>>;
};

type CreateEntityQueryConfig<TEntity, TParams> = {
  queryKey: {
    list: (page: number, params?: TParams) => QueryKey;
    infinite: (params?: TParams) => QueryKey;
    allPages: (params?: TParams) => QueryKey;
  };
  api: EntityQueryApi<TEntity, TParams>;
  keepPreviousData?: boolean;
};

const toListResult = <TEntity>(
  query: UseQueryResult<PaginatedResponse<TEntity>>,
) => ({
  items: query.data?.results ?? [],
  count: query.data?.count ?? 0,
  query,
  isLoading: query.isLoading,
  isFetching: query.isFetching,
  isPlaceholderData: query.isPlaceholderData,
  isError: query.isError,
  error: query.error ?? null,
  refetch: query.refetch,
});

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
        } as TParams & PageParams),
      placeholderData: config.keepPreviousData ? keepPreviousData : undefined,
    });

    return toListResult(query);
  };

  const useEntityAllPagesQuery = (params?: TParams) => {
    const query = useQuery({
      queryKey: config.queryKey.allPages(params),
      queryFn: () =>
        fetchAllPages((page, pageSize) =>
          config.api.getAll({
            ...params,
            page,
            pageSize,
          } as TParams & PageParams),
        ),
      placeholderData: config.keepPreviousData ? keepPreviousData : undefined,
    });

    return toListResult(query);
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
        } as TParams & PageParams),
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
    useAllPagesQuery: useEntityAllPagesQuery,
  };
}
