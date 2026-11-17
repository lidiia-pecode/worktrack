import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { TeamSort, TeamSortKey } from "@/lib/utils/team-rows";

import { SortableHeading } from "../../team/components/SortableHeading";
import { STICKY_PERSON_CELL } from "../../shared/week/sticky-column";

export type PlanningColumn = {
  key: string;
  /** A CSS width: the table lays out its columns once, for every row. */
  width: string;
  heading: ReactNode;
  headingClassName?: string;
};

type PlanningTableProps = {
  /** The month's weeks or the week's days. */
  columns: PlanningColumn[];
  sort: TeamSort;
  onSort: (key: TeamSortKey) => void;
  /** The previous period, kept on screen while the next one loads. */
  isStale: boolean;
  children: ReactNode;
};

/** Planning's grid: the person, a column per week or day, then the total. */
export const PlanningTable = ({
  columns,
  sort,
  onSort,
  isStale,
  children,
}: PlanningTableProps) => {
  const ariaSort = sort.direction === "asc" ? "ascending" : "descending";

  return (
    <div
      className={cn(
        "overflow-x-auto transition-opacity",
        isStale && "opacity-60",
      )}
      aria-busy={isStale}
    >
      <table className="w-full min-w-4xl table-fixed border-collapse">
        <colgroup>
          <col className="w-52" />

          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}

          <col className="w-32" />
        </colgroup>

        <thead>
          <tr className="border-b border-border bg-muted/10">
            <th
              scope="col"
              aria-sort={sort.key === "name" ? ariaSort : undefined}
              className={cn(STICKY_PERSON_CELL, "p-2 text-left")}
            >
              <SortableHeading
                label="Person"
                sortKey="name"
                sort={sort}
                onSort={onSort}
              />
            </th>

            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "border-r border-border/60",
                  column.headingClassName,
                )}
              >
                {column.heading}
              </th>
            ))}

            <th
              scope="col"
              aria-sort={sort.key === "total" ? ariaSort : undefined}
              className="p-2 pr-3"
            >
              <SortableHeading
                label="Planned"
                sortKey="total"
                sort={sort}
                onSort={onSort}
                alignEnd
              />
            </th>
          </tr>
        </thead>

        <tbody>{children}</tbody>
      </table>
    </div>
  );
};
