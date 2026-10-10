"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "../EmptyState";
import { SearchInput } from "../inputs/SearchInput";
import { PickerRow } from "./PickerRow";

export interface EntityPickerProps<T> {
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;

  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSubtitle?: (item: T) => string | null | undefined;
  getAvatarText?: (item: T) => string;

  emptyMessage: ReactNode;
  searchPlaceholder?: string;
  /** Searches on the server: `items` are already the matches. */
  onSearchChange: (query: string) => void;
  /** A row that cannot be chosen, such as a draft activity on a project. */
  isDisabled?: (item: T) => boolean;

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
  emptyMessage,
  searchPlaceholder = "Search...",
  onSearchChange,
  isDisabled,
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
            {items.map((item) => {
              const id = getId(item);

              return (
                <PickerRow
                  key={id}
                  label={getLabel(item)}
                  subtitle={getSubtitle?.(item)}
                  avatarText={getAvatarText?.(item) ?? getLabel(item).charAt(0)}
                  selected={selectedIds.includes(id)}
                  onToggle={() => onToggle(id)}
                  disabled={isDisabled?.(item)}
                />
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
