"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

import { EmptyState } from "../EmptyState";
import { SearchInput } from "../inputs/SearchInput";
import { PickerRow } from "./PickerRow";

/** Consecutive items of the same group, in order; one run when ungrouped. */
const groupRuns = <T,>(items: T[], getGroup?: (item: T) => string) =>
  items.reduce<{ name?: string; items: T[] }[]>((runs, item) => {
    const name = getGroup?.(item);
    const last = runs.at(-1);
    if (last && last.name === name) last.items.push(item);
    else runs.push({ name, items: [item] });
    return runs;
  }, []);

export interface EntityPickerProps<T> {
  items: T[];
  selectedIds: string[];
  onToggle: (item: T) => void;

  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSubtitle?: (item: T) => string | null | undefined;
  getAvatarText?: (item: T) => string;
  /** Shown but not choosable; the subtitle says why. */
  isDisabled?: (item: T) => boolean;
  /** A heading above each run of items in the same group; `items` come grouped. */
  getGroup?: (item: T) => string;

  emptyMessage: ReactNode;
  searchPlaceholder?: string;
  /** Searches on the server: `items` are already the matches. */
  onSearchChange: (query: string) => void;

  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onFetchNextPage?: () => void;

  /** In a side panel: the list takes the panel's height rather than a fixed one. */
  fillsHeight?: boolean;
  className?: string;
}

export const EntityPicker = <T,>({
  items,
  selectedIds,
  onToggle,
  getId,
  getLabel,
  getSubtitle,
  getAvatarText,
  isDisabled,
  getGroup,
  emptyMessage,
  searchPlaceholder = "Search...",
  onSearchChange,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onFetchNextPage,
  fillsHeight = false,
  className,
}: EntityPickerProps<T>) => {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const changeSearch = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el || !onFetchNextPage) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        if (
          el.scrollTop + el.clientHeight >= el.scrollHeight - 150 &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          onFetchNextPage();
        }
        ticking = false;
      });
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, onFetchNextPage]);

  return (
    <div
      className={cn(fillsHeight && "flex min-h-0 flex-1 flex-col", className)}
    >
      <SearchInput
        value={search}
        onChange={changeSearch}
        placeholder={searchPlaceholder}
        autoFocus
      />

      <div
        ref={listRef}
        className={cn(
          "mt-3 overflow-y-auto rounded-xl border border-border bg-card p-1.5",
          fillsHeight ? "min-h-40 flex-1" : "max-h-80",
        )}
      >
        {isLoading ? (
          <div role="status" className="space-y-1 p-1">
            <span className="sr-only">Loading</span>

            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            size="compact"
            title={search ? `No results for "${search}".` : emptyMessage}
          />
        ) : (
          <div className="space-y-0.5">
            {groupRuns(items, getGroup).map(({ name, items: run }) => (
              // A named group is announced with each row a screen reader enters.
              <div
                key={name ?? "all"}
                role={name ? "group" : undefined}
                aria-label={name}
                className="space-y-0.5"
              >
                {name && (
                  <p
                    aria-hidden="true"
                    className="px-3 pt-2 pb-1 text-xs text-muted-foreground"
                  >
                    {name}
                  </p>
                )}
                {run.map((item) => {
                  const id = getId(item);

                  return (
                    <PickerRow
                      key={id}
                      label={getLabel(item)}
                      subtitle={getSubtitle?.(item)}
                      avatarText={
                        getAvatarText?.(item) ?? getLabel(item).charAt(0)
                      }
                      selected={selectedIds.includes(id)}
                      disabled={isDisabled?.(item)}
                      onToggle={() => onToggle(item)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {isFetchingNextPage && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Loading more...
          </p>
        )}
      </div>
    </div>
  );
};
