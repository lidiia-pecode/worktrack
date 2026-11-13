import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  nextTeamSort,
  SortDirection,
  TeamSort,
  TeamSortKey,
} from "@/lib/utils/team-rows";

/** What pressing the button does, from the order it would put the rows in. */
const nextOrderLabel = (
  sortKey: TeamSortKey,
  label: string,
  direction: SortDirection,
) => {
  if (sortKey === "name") {
    return direction === "asc"
      ? "Sort by name, A to Z"
      : "Sort by name, Z to A";
  }
  const time = `Sort by ${label.toLowerCase()} time`;
  return direction === "asc" ? `${time}, least first` : `${time}, most first`;
};

const SortIcon = ({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: SortDirection;
}) => {
  // The sorted column shows the half of the double chevron it sorts by.
  if (!isActive) return <ChevronsUpDown aria-hidden />;
  return direction === "asc" ? (
    <ChevronUp aria-hidden />
  ) : (
    <ChevronDown aria-hidden />
  );
};

type SortableHeadingProps = {
  /** The column's name, such as Person or Logged. */
  label: string;
  sortKey: TeamSortKey;
  sort: TeamSort;
  onSort: (key: TeamSortKey) => void;
  /** The total's column reads from the right. */
  alignEnd?: boolean;
};

/**
 * A week grid's column heading: its name, and beside it the arrows that sort
 * the rows by it, a button of their own.
 */
export const SortableHeading = ({
  label,
  sortKey,
  sort,
  onSort,
  alignEnd = false,
}: SortableHeadingProps) => {
  const isActive = sort.key === sortKey;
  const { direction: nextDirection } = nextTeamSort(sort, sortKey);
  const actionLabel = nextOrderLabel(sortKey, label, nextDirection);

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-2xs font-medium tracking-wider text-muted-foreground uppercase",
        alignEnd && "justify-end",
      )}
    >
      {label}

      <Button
        type="button"
        variant="ghost"
        size="iconXs"
        aria-label={actionLabel}
        title={actionLabel}
        onClick={() => onSort(sortKey)}
        className={cn("size-5 [&_svg]:size-3", isActive && "text-foreground")}
      >
        <SortIcon isActive={isActive} direction={sort.direction} />
      </Button>
    </div>
  );
};
