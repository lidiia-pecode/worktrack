import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import {
  nextTeamSort,
  SortDirection,
  TeamSort,
  TeamSortKey,
} from "@/lib/utils/team-rows";

/** What pressing each button does, from the order it would put the rows in. */
const NEXT_ORDER_LABELS: Record<TeamSortKey, { asc: string; desc: string }> = {
  name: { asc: "Sort by name, A to Z", desc: "Sort by name, Z to A" },
  logged: {
    asc: "Sort by logged time, least first",
    desc: "Sort by logged time, most first",
  },
};

const LABELS: Record<TeamSortKey, string> = {
  name: "Name",
  logged: "Logged",
};

const SortIcon = ({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: SortDirection;
}) => {
  if (!isActive) return <ChevronsUpDown className="size-3" aria-hidden />;
  return direction === "asc" ? (
    <ArrowUp className="size-3" aria-hidden />
  ) : (
    <ArrowDown className="size-3" aria-hidden />
  );
};

type SortButtonProps = {
  sortKey: TeamSortKey;
  sort: TeamSort;
  onSort: (key: TeamSortKey) => void;
};

/** A column's heading that sorts the rows by it: Name, or Logged. */
export const SortButton = ({ sortKey, sort, onSort }: SortButtonProps) => {
  const isActive = sort.key === sortKey;
  const { direction: nextDirection } = nextTeamSort(sort, sortKey);

  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={NEXT_ORDER_LABELS[sortKey][nextDirection]}
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-brand-subtle text-brand"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {LABELS[sortKey]}
      <SortIcon isActive={isActive} direction={sort.direction} />
    </button>
  );
};
