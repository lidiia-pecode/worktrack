import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SearchInput } from "../SearchInput";
import { PickerRow } from "../PickerRow";
import { useActivities } from "@/hooks/useActivities";

type ActivitiesDrawerProps = {
  open: boolean;
  activitiesIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;

  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;

  onSave?: () => void;
};

export const ActivitiesDrawer = ({
  open,
  activitiesIds,
  onToggle,
  onClose,

  hasNextPage,
  isFetchingNextPage,
  onLoadMore,

  onSave,
}: ActivitiesDrawerProps) => {
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

  const { activities } = useActivities();
  console.log("act", activities);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return activities;

    return activities.filter((activity) =>
      activity.name.toLowerCase().includes(query),
    );
  }, [activities, search]);

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
        aria-label="Add team members"
        aria-modal="true"
        className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-100">
          <div className="relative">
            <h3 className="text-sm font-semibold text-zinc-900">
              Add activities
            </h3>

            {activitiesIds.length > 0 && (
              <p className="text-xs text-zinc-400 absolute top-5">
                {activitiesIds.length} selected
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-zinc-100">
          <SearchInput value={search} onChange={setSearch} />
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">
              No activities found
            </p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((activity) => (
                <PickerRow
                  key={activity.id}
                  label={activity.name}
                  subtitle={activity.category?.name}
                  avatarText={activity.name.charAt(0)}
                  selected={activitiesIds.includes(activity.id)}
                  onToggle={() => onToggle(activity.id)}
                />
              ))}
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
};
