"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloseButton } from "./Button";
import { SearchInput } from "./SearchInput";
import { PickerRow } from "./PickerRow";

export type SelectionDrawerProps<T> = {
  open: boolean;
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;

  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;

  onSave?: () => void;

  title: string;
  emptyMessage: string;

  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSubtitle?: (item: T) => string | null | undefined;
  getAvatarText?: (item: T) => string;

  /** Кастомний пошук; за замовчуванням матчить по getLabel() */
  filterItem?: (item: T, query: string) => boolean;
};

export function SelectionDrawer<T>({
  open,
  items,
  selectedIds,
  onToggle,
  onClose,

  hasNextPage,
  isFetchingNextPage,
  onLoadMore,

  onSave,

  title,
  emptyMessage,

  getId,
  getLabel,
  getSubtitle,
  getAvatarText,

  filterItem,
}: SelectionDrawerProps<T>) {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setSearch("");
    onClose();
  }, [onClose]);

  const handleSave = () => {
    onSave?.();
    handleClose();
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      filterItem
        ? filterItem(item, query)
        : getLabel(item).toLowerCase().includes(query),
    );
  }, [items, search, filterItem, getLabel]);

  // Infinite scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
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
          onLoadMore();
        }
        ticking = false;
      });
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  // ESC close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={handleClose}
        className={`absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      <div
        role="dialog"
        aria-label={title}
        aria-modal="true"
        className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-100">
          <div className="relative">
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>

            {selectedIds.length > 0 && (
              <p className="text-xs text-zinc-400 absolute top-5">
                {selectedIds.length} selected
              </p>
            )}
          </div>

          <CloseButton onClick={handleClose} />
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-zinc-100">
          <SearchInput value={search} onChange={setSearch} />
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">
              {emptyMessage}
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
                    avatarText={
                      getAvatarText?.(item) ?? getLabel(item).charAt(0)
                    }
                    selected={selectedIds.includes(id)}
                    onToggle={() => onToggle(id)}
                  />
                );
              })}
            </div>
          )}
          {isFetchingNextPage && (
            <p className="text-xs text-center text-zinc-400 py-2">
              Loading more...
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-zinc-100">
          <button
            onClick={onSave ? handleSave : onClose}
            className="w-full py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
