"use client";

import { ReactNode, useMemo, useState } from "react";

import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Plus,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { EmptyState } from "../EmptyState";
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
  showArchived?: boolean;
  tab?: ResourceTab;
  onTabChange?: (tab: ResourceTab) => void;
  activeCount?: number;
  archivedCount?: number;
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

  showArchived = true,
  tab = "active",
  onTabChange,

  activeCount,
  archivedCount,
}: ResourcePageProps<T>) {
  const [search, setSearch] = useState("");

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
      ? `No archived ${title.toLowerCase()}`
      : emptyTitle;

  const emptyStateDescription = search
    ? `No ${title.toLowerCase()} match "${search}".`
    : isArchived
      ? `Archived ${title.toLowerCase()} will appear here when you archive them.`
      : emptyDescription;

  return (
    <section className="flex min-h-full w-full flex-col p-6">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>

          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {canCreate && onCreate && !isArchived && (
          <Button type="button" onClick={onCreate} className="shrink-0 gap-2">
            <Plus className="size-4" />
            {createLabel}
          </Button>
        )}
      </header>

      {/* Tabs */}
      {showArchived && (
        <div
          role="tablist"
          aria-label={`${title} status`}
          className="mb-5 flex items-center gap-1 border-b border-border"
        >
          <ResourceTabButton
            active={tab === "active"}
            icon={<ArchiveRestore className="size-3.5" />}
            label="Active"
            count={activeCount}
            onClick={() => handleTabChange("active")}
          />

          <ResourceTabButton
            active={tab === "archived"}
            icon={<Archive className="size-3.5" />}
            label="Archived"
            count={archivedCount}
            onClick={() => handleTabChange("archived")}
            muted
          />
        </div>
      )}

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

      {/* Loading */}
      {isLoading && <ResourcePageSkeleton />}

      {/* Error */}
      {!isLoading && isError && (
        <ResourcePageError title={title} onRetry={onRetry} />
      )}

      {/* Empty */}
      {!isLoading && !isError && filteredItems.length === 0 && (
        <EmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
          icon={isArchived ? <Archive className="size-6" /> : emptyIcon}
        />
      )}

      {/* Content */}
      {!isLoading && !isError && filteredItems.length > 0 && (
        <>
          <div
            className={[
              "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
              isArchived && "opacity-[0.82]",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {filteredItems.map(renderItem)}
          </div>

          {hasNextPage && onFetchNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={onFetchNextPage}
                disabled={isFetchingNextPage}
                className="min-w-28"
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

interface ResourceTabButtonProps {
  active: boolean;
  label: string;
  icon: ReactNode;
  count?: number;
  muted?: boolean;
  onClick: () => void;
}

function ResourceTabButton({
  active,
  label,
  icon,
  count,
  muted = false,
  onClick,
}: ResourceTabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
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
          : muted
            ? "text-muted-foreground/65 hover:text-muted-foreground"
            : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "transition-colors",
          active
            ? "text-brand"
            : muted
              ? "text-muted-foreground/50 group-hover:text-muted-foreground"
              : "text-muted-foreground",
        ].join(" ")}
      >
        {icon}
      </span>

      <span>{label}</span>

      {typeof count === "number" && (
        <span
          className={[
            "min-w-5 rounded-full px-1.5 py-0.5",
            "text-center text-[11px] font-medium",
            active
              ? "bg-brand-subtle text-brand"
              : "bg-muted/50 text-muted-foreground/70",
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
}

interface ResourcePageErrorProps {
  title: string;
  onRetry?: () => void;
}

function ResourcePageError({ title, onRetry }: ResourcePageErrorProps) {
  return (
    <div
      className="
        flex min-h-[360px] flex-1 flex-col
        items-center justify-center
        rounded-2xl
        border border-destructive/20
        bg-destructive/5
        p-8
        text-center
      "
    >
      <div
        className="
          flex size-12 items-center justify-center
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
