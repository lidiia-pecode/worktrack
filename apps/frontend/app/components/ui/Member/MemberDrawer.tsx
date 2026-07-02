import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { User } from "@/types";
import { SearchInput } from "../SearchInput";
import { UserPickerRow } from "../UserPickerRow";
import { isAdminRole } from "../../helpers";

type MemberDrawerProps = {
  open: boolean;
  users: User[];
  memberIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

export const MemberDrawer = ({
  open,
  users,
  memberIds,
  onToggle,
  onClose,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: MemberDrawerProps) => {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const fullName = (u: User) => `${u.firstName} ${u.lastName}`;

  const handleClose = useCallback(() => {
    setSearch("");
    onClose();
  }, [onClose]);

  const nonAdminUsers = useMemo(
    () => users.filter((u) => !isAdminRole(u.role)),
    [users],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? nonAdminUsers.filter((u) => fullName(u).toLowerCase().includes(q))
      : nonAdminUsers;
  }, [nonAdminUsers, search]);

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
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Add members</h3>
            {memberIds.length > 0 && (
              <p className="text-xs text-zinc-400 mt-0.5">
                {memberIds.length} selected
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
              No users found
            </p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((u) => (
                <UserPickerRow
                  key={u.id}
                  user={u}
                  selected={memberIds.includes(u.id)}
                  onToggle={() => onToggle(u.id)}
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

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-100">
          <button
            onClick={handleClose}
            className="w-full py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
};
