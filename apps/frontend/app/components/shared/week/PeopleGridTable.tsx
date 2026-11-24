import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { TeamSort, TeamSortKey } from "@/lib/utils/team-rows";

import { SortableHeading } from "./SortableHeading";
import { STICKY_PERSON_CELL } from "./sticky-column";

export type GridColumn = {
  key: string;
  /**
   * A CSS width: the table lays out its columns once, for every row. Columns
   * without one share what the others leave.
   */
  width?: string;
  heading: ReactNode;
  headingClassName: string;
};

type PeopleGridTableProps = {
  /** The month's weeks or the week's days. */
  columns: GridColumn[];
  /** The last column's heading: what a row's total counts. */
  totalLabel: string;
  /** The table's own classes: the least it may be squeezed to. */
  className: string;
  sort: TeamSort;
  onSort: (key: TeamSortKey) => void;
  /** The previous period, kept on screen while the next one loads. */
  isStale: boolean;
  children: ReactNode;
};

/**
 * The grid Team time and Planning share: the person, a column per week or
 * day, then the row's total.
 */
export const PeopleGridTable = ({
  columns,
  totalLabel,
  className,
  sort,
  onSort,
  isStale,
  children,
}: PeopleGridTableProps) => {
  const ariaSort = sort.direction === "asc" ? "ascending" : "descending";

  return (
    <div
      className={cn(
        "overflow-x-auto transition-opacity",
        isStale && "opacity-60",
      )}
      aria-busy={isStale}
    >
      <table className={cn("w-full table-fixed border-collapse", className)}>
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
                label={totalLabel}
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
