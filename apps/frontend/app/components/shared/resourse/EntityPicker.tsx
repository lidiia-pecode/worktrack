"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  renderIcon?: (item: T) => React.ReactNode;

  emptyMessage: string;
  searchPlaceholder?: string;
  filterItem?: (item: T, query: string) => boolean;

  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onFetchNextPage?: () => void;

  className?: string;
}

export function EntityPicker<T>({
  items,
  selectedIds,
  onToggle,
  getId,
  getLabel,
  getSubtitle,
  getAvatarText,
  renderIcon,
  emptyMessage,
  searchPlaceholder = "Search...",
  filterItem,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onFetchNextPage,
  className,
}: EntityPickerProps<T>) {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      filterItem
        ? filterItem(item, query)
        : getLabel(item).toLowerCase().includes(query),
    );
  }, [items, search, filterItem, getLabel]);

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
        onChange={setSearch}
        placeholder={searchPlaceholder}
        autoFocus
      />

      <div
        ref={listRef}
        className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-border bg-card p-1.5"
      >
        {isLoading ? (
          <div className="space-y-1 p-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {search ? `No results for "${search}".` : emptyMessage}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((item) => {
              const id = getId(item);

              return (
                <PickerRow
                  key={id}
                  label={getLabel(item)}
                  subtitle={getSubtitle?.(item)}
                  avatarText={getAvatarText?.(item) ?? getLabel(item).charAt(0)}
                  icon={renderIcon?.(item)}
                  selected={selectedIds.includes(id)}
                  onToggle={() => onToggle(id)}
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
}
