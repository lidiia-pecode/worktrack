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

const BUTTONS: { key: TeamSortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "logged", label: "Logged" },
];

const sortIcon = (isActive: boolean, direction: SortDirection) => {
  if (!isActive) return ChevronsUpDown;
  return direction === "asc" ? ArrowUp : ArrowDown;
};

type PersonSortHeaderProps = {
  sort: TeamSort;
  onSort: (key: TeamSortKey) => void;
};

/** The Person column's heading: its two sort buttons. */
export const PersonSortHeader = ({ sort, onSort }: PersonSortHeaderProps) => (
  <div className="flex items-center gap-1">
    {BUTTONS.map(({ key, label }) => {
      const isActive = sort.key === key;
      const { direction: nextDirection } = nextTeamSort(sort, key);
      const Icon = sortIcon(isActive, sort.direction);

      return (
        <button
          key={key}
          type="button"
          aria-pressed={isActive}
          aria-label={NEXT_ORDER_LABELS[key][nextDirection]}
          onClick={() => onSort(key)}
          className={cn(
            "flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive
              ? "bg-brand-subtle text-brand"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {label}
          <Icon className="size-3" aria-hidden />
        </button>
      );
    })}
  </div>
);
