"use client";

import { ReactNode, useId } from "react";

import { Archive, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ManageListState } from "@/hooks/useManageListState";
import { cn } from "@/lib/utils/cn";

import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { PageHeader } from "../PageHeader";
import { createActionPlacement } from "./create-action";
import { ManageToolbar, manageTabId } from "./ManageToolbar";

const SKELETON_ROWS = 5;

interface ResourcePageProps {
  title: string;
  description?: string;

  listState: ManageListState;
  itemCount: number;

  isLoading?: boolean;
  /** The previous results stay on screen, dimmed, while new ones load. */
  isRefreshing?: boolean;
  isError?: boolean;
  onRetry?: () => void;

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

  topContent?: ReactNode;
  archivedLabel?: string;
  archiveVerb?: string;
  /** The list itself, shown once there is something in it. */
  children: ReactNode;
}

export const ResourcePage = ({
  title,
  description,

  listState,
  itemCount,

  isLoading = false,
  isRefreshing = false,
  isError = false,
  onRetry,

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

  topContent,

  archivedLabel = "Archived",
  archiveVerb = "archive",
  children,
}: ResourcePageProps) => {
  const panelId = useId();
  const { tab, searchQuery } = listState;

  const isArchived = tab === "archived";
  const lowerTitle = title.toLowerCase();

  const emptyStateTitle = searchQuery
    ? "No results found"
    : isArchived
      ? `No ${archivedLabel.toLowerCase()} ${lowerTitle}`
      : emptyTitle;

  const emptyStateDescription = searchQuery
    ? `No ${lowerTitle} match "${searchQuery}".`
    : isArchived
      ? `${archivedLabel} ${lowerTitle} will appear here when you ${archiveVerb} them.`
      : emptyDescription;

  const createAction = createActionPlacement({
    canCreate: Boolean(canCreate && onCreate && !isArchived),
    isLoading,
    isError,
    itemCount,
    isSearching: Boolean(searchQuery),
  });

  const createButton = (
    <Button type="button" onClick={onCreate} className="gap-2">
      <Plus className="size-4" />
      {createLabel}
    </Button>
  );

  return (
    <section className="flex flex-1 flex-col">
      <PageHeader
        title={title}
        description={description}
        actions={createAction === "header" && createButton}
      />

      <ManageToolbar
        title={title}
        listState={listState}
        panelId={panelId}
        archivedLabel={archivedLabel}
        searchPlaceholder={searchPlaceholder}
      />

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={manageTabId(panelId, tab)}
        className="flex flex-1 flex-col"
      >
        {topContent}

        {isLoading && <ResourcePageSkeleton />}

        {!isLoading && isError && (
          <ErrorState
            title={`Unable to load ${lowerTitle}`}
            description="Something went wrong while loading this page."
            onRetry={onRetry}
          />
        )}

        {!isLoading && !isError && itemCount === 0 && (
          <EmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
            icon={isArchived ? <Archive className="size-6" /> : emptyIcon}
            action={createAction === "emptyState" && createButton}
          />
        )}

        {!isLoading && !isError && itemCount > 0 && (
          <div
            aria-busy={isRefreshing}
            className={cn("transition-opacity", isRefreshing && "opacity-60")}
          >
            {children}

            {hasNextPage && onFetchNextPage && (
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onFetchNextPage}
                  isLoading={isFetchingNextPage}
                  className="min-w-28"
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const ResourcePageSkeleton = () => (
  <div role="status" className="flex flex-col gap-2">
    <span className="sr-only">Loading</span>

    {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
      <Skeleton
        key={index}
        className="h-14 rounded-xl border border-border bg-card"
      />
    ))}
  </div>
);
