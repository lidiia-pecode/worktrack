"use client";

import { ReactNode, useMemo, useState } from "react";

import { AlertCircle, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { EmptyState } from "../EmptyState";
import { SearchInput } from "../inputs/SearchInput";

interface ResourcePageProps<T> {
  title: string;
  description?: string;

  items: T[];

  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;

  getSearchValue?: (item: T) => string;
  searchPlaceholder?: string;

  emptyTitle: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;

  createLabel?: string;
  onCreate?: () => void;
  canCreate?: boolean;

  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onFetchNextPage?: () => void;

  renderItem: (item: T) => ReactNode;
}

export function ResourcePage<T>({
  title,
  description,
  items,
  isLoading = false,
  isError = false,
  onRetry,
  getSearchValue,
  searchPlaceholder = "Search",
  emptyTitle,
  emptyDescription,
  emptyIcon,
  createLabel = "Create",
  onCreate,
  canCreate = true,
  hasNextPage = false,
  isFetchingNextPage = false,
  onFetchNextPage,
  renderItem,
}: ResourcePageProps<T>) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim() || !getSearchValue) {
      return items;
    }

    const query = search.trim().toLowerCase();

    return items.filter((item) =>
      getSearchValue(item).toLowerCase().includes(query),
    );
  }, [items, search, getSearchValue]);

  return (
    <section className="flex min-h-full w-full flex-col p-6">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>

          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {canCreate && onCreate && (
          <Button type="button" onClick={onCreate} className="shrink-0 gap-2">
            <Plus className="size-4" />
            {createLabel}
          </Button>
        )}
      </div>

      {!isLoading && !isError && items.length > 0 && getSearchValue && (
        <div className="mb-5 max-w-sm">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
          />
        </div>
      )}

      {isLoading && <ResourcePageSkeleton />}

      {!isLoading && isError && (
        <div
          className="
            flex min-h-[360px]
            flex-1
            flex-col
            items-center
            justify-center
            rounded-2xl
            border border-destructive/20
            bg-destructive/5
            p-8
            text-center
          "
        >
          <div
            className="
              flex size-12
              items-center justify-center
              rounded-2xl
              bg-destructive/10
              text-destructive
            "
          >
            <AlertCircle className="size-6" />
          </div>

          <h2 className="mt-5 text-base font-semibold text-foreground">
            Unable to load {title.toLowerCase()}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong while loading this page.
          </p>

          {onRetry && (
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              className="mt-5 gap-2"
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && filteredItems.length === 0 && (
        <EmptyState
          title={search ? "No results found" : emptyTitle}
          description={
            search
              ? `No ${title.toLowerCase()} match "${search}".`
              : emptyDescription
          }
          icon={emptyIcon}
        />
      )}

      {!isLoading && !isError && filteredItems.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map(renderItem)}
          </div>

          {hasNextPage && onFetchNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={onFetchNextPage}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ResourcePageSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="
            h-44
            animate-pulse
            rounded-xl
            border border-border
            bg-card
          "
        />
      ))}
    </div>
  );
}
