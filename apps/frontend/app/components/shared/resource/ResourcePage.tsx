"use client";

import { KeyboardEvent, ReactNode, useId, useMemo, useState } from "react";

import { Archive, ArchiveRestore, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getNextTabIndex } from "@/lib/utils/tabs";

import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { PageHeader } from "../PageHeader";
import { createActionPlacement } from "./create-action";
import { SearchInput } from "../inputs/SearchInput";

export type ResourceTab = "active" | "archived";

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
  topContent?: ReactNode;
  showArchived?: boolean;
  archivedLabel?: string;
  archiveVerb?: string;
  tab?: ResourceTab;
  onTabChange?: (tab: ResourceTab) => void;
  activeCount?: number;
  archivedCount?: number;
}

export const ResourcePage = <T,>({
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
  topContent,

  showArchived = true,
  archivedLabel = "Archived",
  archiveVerb = "archive",
  tab = "active",
  onTabChange,

  activeCount,
  archivedCount,
}: ResourcePageProps<T>) => {
  const [search, setSearch] = useState("");
  const tabsId = useId();

  const isArchived = tab === "archived";
  const hasSearch = Boolean(getSearchValue);
  const hasItems = items.length > 0;

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query || !getSearchValue) {
      return items;
    }

    return items.filter((item) =>
      getSearchValue(item).toLowerCase().includes(query),
    );
  }, [items, search, getSearchValue]);

  const handleTabChange = (nextTab: ResourceTab) => {
    if (nextTab === tab) {
      return;
    }

    setSearch("");
    onTabChange?.(nextTab);
  };

  const emptyStateTitle = search
    ? "No results found"
    : isArchived
      ? `No ${archivedLabel.toLowerCase()} ${title.toLowerCase()}`
      : emptyTitle;

  const createAction = createActionPlacement({
    canCreate: Boolean(canCreate && onCreate && !isArchived),
    isLoading,
    isError,
    itemCount: items.length,
    isSearching: Boolean(search.trim()),
  });

  const emptyStateDescription = search
    ? `No ${title.toLowerCase()} match "${search}".`
    : isArchived
      ? `${archivedLabel} ${title.toLowerCase()} will appear here when you ${archiveVerb} them.`
      : emptyDescription;

  return (
    <section className="flex flex-1 flex-col">
      <PageHeader
        title={title}
        description={description}
        actions={
          createAction === "header" && (
            <Button type="button" onClick={onCreate} className="gap-2">
              <Plus className="size-4" />
              {createLabel}
            </Button>
          )
        }
      />

      {/* Tabs */}
      {showArchived && (
        <ResourceTabList label={`${title} status`} className="mb-5">
          <ResourceTabButton
            id={`${tabsId}-active`}
            controls={`${tabsId}-panel`}
            active={tab === "active"}
            icon={<ArchiveRestore className="size-3.5" />}
            label="Active"
            count={activeCount}
            onClick={() => handleTabChange("active")}
          />

          <ResourceTabButton
            id={`${tabsId}-archived`}
            controls={`${tabsId}-panel`}
            active={tab === "archived"}
            icon={<Archive className="size-3.5" />}
            label={archivedLabel}
            count={archivedCount}
            onClick={() => handleTabChange("archived")}
          />
        </ResourceTabList>
      )}

      <div
        role={showArchived ? "tabpanel" : undefined}
        id={`${tabsId}-panel`}
        aria-labelledby={showArchived ? `${tabsId}-${tab}` : undefined}
        className="flex flex-1 flex-col"
      >
        {topContent}

        {/* Search */}
        {!isLoading && !isError && hasItems && hasSearch && (
          <div className="mb-5 w-full max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {isLoading && <ResourcePageSkeleton />}

        {!isLoading && isError && (
          <ErrorState
            title={`Unable to load ${title.toLowerCase()}`}
            description="Something went wrong while loading this page."
            onRetry={onRetry}
          />
        )}

        {!isLoading && !isError && filteredItems.length === 0 && (
          <EmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
            icon={isArchived ? <Archive className="size-6" /> : emptyIcon}
            action={
              createAction === "emptyState" && (
                <Button type="button" onClick={onCreate} className="gap-2">
                  <Plus className="size-4" />
                  {createLabel}
                </Button>
              )
            }
          />
        )}

        {/* Content */}
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
                  isLoading={isFetchingNextPage}
                  className="min-w-28"
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

interface ResourceTabListProps {
  label: string;
  className?: string;
  children: ReactNode;
}

export const ResourceTabList = ({
  label,
  className,
  children,
}: ResourceTabListProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const currentIndex = tabs.findIndex((tab) => tab === event.target);
    if (currentIndex === -1) return;

    const nextIndex = getNextTabIndex(event.key, currentIndex, tabs.length);
    if (nextIndex === null) return;

    event.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={["flex items-center gap-1 border-b border-border", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};

interface ResourceTabButtonProps {
  id: string;
  controls: string;
  active: boolean;
  label: string;
  icon: ReactNode;
  count?: number;
  onClick: () => void;
}

export const ResourceTabButton = ({
  id,
  controls,
  active,
  label,
  icon,
  count,
  onClick,
}: ResourceTabButtonProps) => {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={[
        "group relative flex items-center gap-2",
        "px-3 py-2.5",
        "text-sm font-medium",
        "transition-colors",
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-ring",
        "focus-visible:ring-offset-2",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "transition-colors",
          active ? "text-brand" : "text-muted-foreground",
        ].join(" ")}
      >
        {icon}
      </span>

      <span>{label}</span>

      {typeof count === "number" && (
        <span
          className={[
            "min-w-5 rounded-full px-1.5 py-0.5",
            "text-center text-2xs font-medium",
            active
              ? "bg-brand-subtle text-brand"
              : "bg-muted/50 text-muted-foreground",
          ].join(" ")}
        >
          {count}
        </span>
      )}

      <span
        aria-hidden="true"
        className={[
          "absolute inset-x-2 -bottom-px h-0.5 rounded-full",
          "transition-all",
          active ? "bg-brand opacity-100" : "bg-transparent opacity-0",
        ].join(" ")}
      />
    </button>
  );
};

const ResourcePageSkeleton = () => (
  <div role="status" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <span className="sr-only">Loading</span>

    {Array.from({ length: 3 }).map((_, index) => (
      <Skeleton
        key={index}
        className="h-44 rounded-xl border border-border bg-card"
      />
    ))}
  </div>
);
