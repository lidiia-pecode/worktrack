"use client";

import { Search, Filter } from "lucide-react";
import { Status } from "@/types/enums";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | Status;

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  archivedCount?: number;
  className?: string;
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: Status.ACTIVE, label: "Active" },
  { value: Status.ARCHIVED, label: "Archived" },
];

export function FilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  archivedCount,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-3 mb-6", className)}>
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name…"
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-zinc-400"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
        {FILTER_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value;
          const showCount =
            option.value === Status.ARCHIVED && archivedCount !== undefined;

          return (
            <button
              key={option.value}
              onClick={() => onStatusFilterChange(option.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150",
                isActive
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              {option.label}
              {showCount && archivedCount !== undefined && (
                <span className="ml-1.5 text-xs text-zinc-400">
                  ({archivedCount})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
