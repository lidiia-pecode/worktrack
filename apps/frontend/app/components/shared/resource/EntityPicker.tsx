"use client";

import { Fragment, ReactNode, useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "../EmptyState";
import { SearchInput } from "../inputs/SearchInput";
import { PickerRow } from "./PickerRow";

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
    <div className={className}>
      <SearchInput
        value={search}
        onChange={changeSearch}
        placeholder={searchPlaceholder}
        autoFocus
      />

      <div
        ref={listRef}
        className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-border bg-card p-1.5"
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
            {items.map((item, index) => {
              const id = getId(item);
              const group = getGroup?.(item);
              const startsGroup =
                group !== undefined &&
                (index === 0 || getGroup?.(items[index - 1]) !== group);

              return (
                <Fragment key={id}>
                  {startsGroup && (
                    <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">
                      {group}
                    </p>
                  )}
                  <PickerRow
                    label={getLabel(item)}
                    subtitle={getSubtitle?.(item)}
                    avatarText={
                      getAvatarText?.(item) ?? getLabel(item).charAt(0)
                    }
                    selected={selectedIds.includes(id)}
                    disabled={isDisabled?.(item)}
                    onToggle={() => onToggle(item)}
                  />
                </Fragment>
              );
            })}
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
